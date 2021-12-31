/* eslint-disable max-len, no-use-before-define */

import {
  forEachObj, mapObj, partition, pick,
} from "@polygraph/utils";
import { makeResourceQuiver, ResourceQuiverResult } from "../data-structures/resource-quiver";
import {
  ResourceTree,
  NormalizedResources,
  NormalizedResourceUpdates,
  Query,
  QueryParams,
  DataTree,
  Schema,
  MemoryStore,
  ExpandedResourceTree,
  QueryResultResource,
  QueryWithId,
  ResourceOfType,
  ExpandedSchema,
  QueryProps,
  QueryRels,
  ReplacementResponse,
  Writeable,
} from "../types";
import {
  asArray, cardinalize, formatValidationError, queryTree,
} from "../utils";
import { PolygraphGetQuerySyntaxError, PolygraphReplaceSyntaxError } from "../validations/errors";
import { syntaxValidations as syntaxValidationsForSchema } from "../validations/syntax-validations";
import { extractQuiver } from "./extract-quiver";

interface MemoryStoreOptions<S extends Schema> {
  initialData?: NormalizedResourceUpdates<S>;
}

/**
 * TODO:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */
function makeEmptyStore<S extends Schema>(schema: S): NormalizedResources<S> {
  const resources = {} as Record<keyof S["resources"], Record<string, ResourceOfType<S, keyof S["resources"]>>>;
  const resTypes = Object.keys(schema.resources) as (keyof S["resources"])[];
  resTypes.forEach(
    <ResType extends keyof S["resources"]>(resourceName: ResType) => {
      resources[resourceName] = {} as Record<string, Writeable<ResourceOfType<S, ResType>>>;
    },
  );
  return resources as Writeable<NormalizedResources<S>>;
}

export async function makeMemoryStore<S extends Schema>(
  schema: S,
  options: MemoryStoreOptions<S> = {},
): Promise<MemoryStore<S>> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const store: NormalizedResources<S> = makeEmptyStore(schema);
  const syntaxValidations = syntaxValidationsForSchema(schema);

  const applyQuiver = async (
    quiver: ResourceQuiverResult<S>,
  ): Promise<ReplacementResponse<S>> => {
    const errorsOrData = await extractQuiver(schema, store, quiver);

    if (!errorsOrData.isValid) {
      return errorsOrData;
    }

    forEachObj(errorsOrData.data, (ressById, resType) => {
      const untypedStore = store as any;
      forEachObj(ressById, (resValue, resId) => {
        if (resValue === null) {
          delete untypedStore[resType][resId];
        } else {
          untypedStore[resType][resId] = resValue;
        }
      });
    });

    return errorsOrData;
  };

  // TODO: do not allow this to be valid if a resource is missing from both the updates or the store
  // (imagine a case where no props are required--it might be fine in a tree, but not a res update)
  const replaceResources = async (updated: NormalizedResourceUpdates<S>): Promise<ReplacementResponse<S>> => {
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      Object.entries(updated).forEach(([type, typedResources]) => {
        Object.entries(typedResources).forEach(([id, updatedRes]) => {
          if (updatedRes === null) {
            retractResource(store[type][id]);
          } else {
            assertResource(updatedRes as ResourceOfType<S, typeof type>, store[type][id]);
          }
        });
      });
    });

    return applyQuiver(quiver);
  };

  const buildTree = <
    ResType extends keyof S["resources"] & string,
    Q extends Query<S, ResType>
  >(query: Q, resource: ResourceOfType<S, ResType>): any => {
    type PartitionedRelKeys = [
      (keyof S["resources"][ResType & string]["relationships"] & string)[],
      (keyof S["resources"][ResType & string]["relationships"] & string)[]
    ];
    const schemaResDef = expandedSchema.resources[query.type];
    const schemaPropKeys = Object.keys(schemaResDef.properties);
    const schemaRelKeys = Object.keys(schemaResDef.relationships);
    const propKeys = query.properties ?? schemaPropKeys;
    const [refRelKeys, nestedRelKeys]: PartitionedRelKeys = query.relationships
      ? partition(
        Object.keys(query.relationships),
        (relKey) => query.relationships[relKey].referencesOnly,
      )
      : [schemaRelKeys, []];

    const relsToRefs = pick(resource.relationships, refRelKeys);
    const relsToExpand = pick(resource.relationships, nestedRelKeys);

    const expandedRels = mapObj(
      relsToExpand,
      <RelType extends (keyof S["resources"][ResType]["relationships"] & string)>(relRef: any, relKey) => {
        const relDef = schemaResDef.relationships[relKey];
        const subResourceRefs = asArray(resource.relationships[relKey]);
        const subRel = query.relationships[relKey];
        const subQuery: Query<S, RelType> = { ...subRel, type: relDef.type as RelType };
        const subTrees = subResourceRefs.map((subResRef) => {
          const subRes = store[subResRef.type][subResRef.id];
          return buildTree(subQuery, subRes);
        });
        return cardinalize(subTrees, relDef);
      });

    return {
      type: resource.type,
      id: resource.id,
      ...pick(resource.properties, propKeys),
      ...relsToRefs,
      ...expandedRels,
    };
  };

  const getOne = async <
    TopResType extends keyof S["resources"],
    Q extends QueryWithId<S, TopResType>,
    QProps extends QueryProps<S, TopResType, Q>,
    QRels extends QueryRels<S, TopResType, Q>,
  >(query: Q & { type: TopResType }, params: QueryParams<S> = {}): Promise<any> => {
    if (!syntaxValidations.querySyntax(query)) {
      throw new PolygraphGetQuerySyntaxError(query, syntaxValidations.querySyntax.errors);
    }

    const out = store[query.type][query.id]
      ? buildTree(query, store[query.type][query.id])
      : null;

    return Promise.resolve(out);
  };

  const getMany = <
    TopResType extends keyof S["resources"],
    Q extends Query<S, TopResType>
  >(
      query: Q,
      params: QueryParams<S>,
    ): Promise<QueryResultResource<S, TopResType>[]> => {
    const allResources = Object.values(store[query.type]);
    const out = allResources.map((res) => buildTree(query, res));

    return Promise.resolve(out);
  };

  const get = <
    ResType extends keyof S["resources"],
    Q extends Query<S, ResType>,
    QProps extends QueryProps<S, ResType, Q>,
    QRels extends QueryRels<S, ResType, Q>
  >(
      query: Q & { type: ResType },
      params: QueryParams<S>,
    ): "id" extends keyof Q ? Promise<QueryResultResource<S, ResType, QProps, QRels>> : Promise<QueryResultResource<S, ResType, QProps, QRels>[]> => {
    const out = ("id" in query)
      ? getOne(query as Q & { id: string }, params)
      : getMany(query, params);

    return out as ("id" extends keyof Q
      ? Promise<QueryResultResource<S, ResType, QProps, QRels>>
      : Promise<QueryResultResource<S, ResType, QProps, QRels>[]>
    );
  };

  const replaceMany = async <TopResType extends keyof S["resources"], Q extends Query<S, TopResType & string>>(
    query: Q,
    trees: DataTree[],
    params: QueryParams<S> = {},
  ): Promise<ReplacementResponse<S>> => {
    const seenRootResourceIds: Set<string> = new Set();
    const existingResources = store[query.type];
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      trees.forEach((tree) => {
        const { descendantResources, rootResource } = queryTree(schema, query, tree);

        seenRootResourceIds.add(rootResource.id);
        assertResource(rootResource, store[rootResource.type][rootResource.id]);
        descendantResources.forEach((res) => assertResource(res, store[res.type][res.id]));
      });

      Object.entries(existingResources).forEach(([resId, existingRes]) => {
        if (!seenRootResourceIds.has(resId)) {
          retractResource(existingRes);
        }
      });
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async <TopResType extends keyof S["resources"], Q extends QueryWithId<S, TopResType & string>>(
    query: Q,
    tree: DataTree,
  ): Promise<ReplacementResponse<S>> => {
    const { queryTreeSyntax } = syntaxValidations;
    if (!queryTreeSyntax({ query, tree })) {
      throw new PolygraphReplaceSyntaxError(query, tree, queryTreeSyntax.errors);
    }

    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      if (tree === null) {
        retractResource({ type: query.type, id: query.id });
      } else {
        const { allResources } = queryTree(schema, query, tree);
        allResources.forEach((res) => assertResource(res, store[res.type][res.id]));
      }
    });

    return applyQuiver(quiver);
  };

  if (options.initialData) {
    const initDataResponse = await replaceResources(options.initialData);
    if (initDataResponse.isValid === false) {
      throw new Error(`Invalid initial data.\n\n${initDataResponse.errors.map(formatValidationError).join("\n")}`);
    }
  }

  return {
    get,
    replaceOne,
    replaceMany,
    replaceResources,
  } as MemoryStore<S>;
}
