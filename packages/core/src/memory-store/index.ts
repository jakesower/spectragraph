/* eslint-disable max-len, no-use-before-define */

import {
  forEachObj, groupBy, mapObj, partition, pick,
} from "@polygraph/utils";
import { makeResourceQuiver, ResourceQuiverResult } from "../data-structures/resource-quiver";
import {
  Query,
  DataTree,
  Schema,
  ExpandedSchema,
  Writeable,
  NormalResourceUpdate,
  NormalResource,
  PolygraphStore,
  Store,
} from "../types";
import {
  asArray, cardinalize, denormalizeResource, normalizeResource, queryTree,
} from "../utils";
import { PolygraphGetQuerySyntaxError, PolygraphReplaceSyntaxError } from "../validations/errors";
import { syntaxValidations as syntaxValidationsForSchema } from "../validations/syntax-validations";
import { validateAndExtractQuiver } from "./validate-and-extract-quiver";

export interface MemoryStore<S extends Schema> extends PolygraphStore<S> {
  replaceResources: (resources: Store<S>) => Promise<void>;
}

type Validation = any;

interface MemoryStoreOptions<S extends Schema> {
  initialData?: Store<S>;
  validations?: Validation[];
}

type StoreResource<S extends Schema, RT extends keyof S["resources"]> = Writeable<NormalResource<S, RT>>;

export type StoreFormat<S extends Schema> = {
  [ResType in keyof S["resources"]]:
    Record<string, StoreResource<S, ResType & string>>;
}

/**
 * TODO:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */
function makeEmptyStore<S extends Schema>(schema: S): StoreFormat<S> {
  const resources = {} as StoreFormat<S>;
  const resTypes = Object.keys(schema.resources) as (keyof S["resources"])[];
  resTypes.forEach(
    <ResType extends keyof S["resources"]>(resourceName: ResType) => {
      resources[resourceName] = {} as Record<string, StoreResource<S, ResType>>;
    },
  );
  return resources as StoreFormat<S>;
}

export async function makeMemoryStore<S extends Schema>(
  schema: S,
  options: MemoryStoreOptions<S> = {},
): Promise<MemoryStore<S>> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const store: StoreFormat<S> = makeEmptyStore(schema);
  const syntaxValidations = syntaxValidationsForSchema(schema);
  const customValidations = options.validations ?? [];
  const resourceValidations = groupBy(customValidations, (v) => v.resourceType);

  const applyQuiver = async (
    quiver: ResourceQuiverResult<S>,
  ): Promise<any> => {
    const data = await validateAndExtractQuiver(schema, store, quiver, resourceValidations);
    const output = {} as any;

    forEachObj(data, (ressById, resType) => {
      const untypedStore = store as any;
      output[resType] = {};
      forEachObj(ressById, (resValue, resId) => {
        if (resValue === null) {
          delete untypedStore[resType][resId];
        } else {
          untypedStore[resType][resId] = resValue;
        }
        output[resType][resId] = denormalizeResource(resValue);
      });
    });

    return output;
  };

  // TODO: do not allow this to be valid if a resource is missing from both the updates or the store
  // (imagine a case where no props are required--it might be fine in a tree, but not a res update)
  const replaceResources = async (updated: Store<S>): Promise<void> => {
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      Object.entries(updated).forEach(([type, typedResources]) => {
        Object.entries(typedResources).forEach(([id, updatedRes]) => {
          if (updatedRes === null) {
            retractResource(store[type][id]);
          } else {
            assertResource(
              normalizeResource(schema, type, updatedRes),
              store[type][id] as NormalResourceUpdate<S, typeof type>,
            );
          }
        });
      });
    });

    return applyQuiver(quiver);
  };

  const buildTree = <
    ResType extends keyof S["resources"] & string,
    Q extends Query<S, ResType>
  >(query: Q, resource: NormalResource<S, ResType>): any => {
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
        const subQuery: Query<S, RelType> = { ...subRel, type: relDef.relatedType as RelType };
        const subTrees = subResourceRefs.map((subResRef) => {
          const subRes = store[subResRef.type][subResRef.id];
          return buildTree(subQuery, subRes);
        });
        return cardinalize(subTrees, relDef);
      });

    return {
      id: resource.id,
      ...pick(resource.properties, propKeys),
      ...relsToRefs,
      ...expandedRels,
    };
  };

  const getOne = async <RT extends keyof S["resources"]>(query: Query<S, RT>): Promise<any> => {
    if (!syntaxValidations.querySyntax(query)) {
      throw new PolygraphGetQuerySyntaxError(query, syntaxValidations.querySyntax.errors);
    }

    const out = store[query.type][query.id]
      ? buildTree(query, store[query.type][query.id])
      : null;

    return Promise.resolve(out);
  };

  const getMany = <RT extends keyof S["resources"]>(query: Query<S, RT>): Promise<any[]> => {
    const allResources = Object.values(store[query.type]);
    const out = allResources.map((res) => buildTree(query, res));

    return Promise.resolve(out);
  };

  const get = <RT extends keyof S["resources"]>(query: Query<S, RT>): Promise<any> => (
    ("id" in query)
      ? getOne(query)
      : getMany(query)
  );

  const replaceMany = async <RT extends keyof S["resources"]>(
    query: Query<S, RT>,
    trees: DataTree[],
  ): Promise<Store<S>> => {
    const seenRootResourceIds: Set<string> = new Set();
    const existingResources = store[query.type];
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      trees.forEach((tree) => {
        const { forEachResource, rootResource } = queryTree(schema, query, tree);

        seenRootResourceIds.add(rootResource.id);
        assertResource(rootResource, store[rootResource.type][rootResource.id]);
        forEachResource((res) => {
          assertResource(res, store[res.type][res.id]);
        });
      });

      Object.entries(existingResources).forEach(([resId, existingRes]) => {
        if (!seenRootResourceIds.has(resId)) {
          retractResource(existingRes);
        }
      });
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async <RT extends keyof S["resources"]>(
    query: Query<S, RT> & { id: string },
    tree: DataTree,
  ): Promise<Store<S>> => {
    const { queryTreeSyntax } = syntaxValidations;
    if (!queryTreeSyntax({ query, tree })) {
      throw new PolygraphReplaceSyntaxError(query, tree, queryTreeSyntax.errors);
    }

    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      if (tree === null) {
        retractResource({ type: query.type, id: query.id });
      } else {
        queryTree(schema, query, tree).forEachResource((res) => assertResource(res, store[res.type][res.id]));
      }
    });

    return applyQuiver(quiver);
  };

  if (options.initialData) {
    await replaceResources(options.initialData);
  }

  return {
    get,
    replaceOne,
    replaceMany,
    replaceResources,
  } as MemoryStore<S>;
}
