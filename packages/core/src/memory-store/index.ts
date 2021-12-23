/* eslint-disable max-len, no-use-before-define */

import {
  filterObj,
  forEachObj,
  keyBy, mapObj, partition, pick,
} from "@polygraph/utils";
import { makeResourceQuiver, ResourceQuiverResult } from "../data-structures/resource-quiver";
import {
  ResourceTree,
  NormalizedResources,
  NormalizedResourceUpdates,
  Query,
  QueryParams,
  CompiledQuery,
  ResourceRef,
  DataTree,
  Schema,
  MemoryStore,
  ExpandedResourceTree,
  QueryResultResource,
  QueryWithId,
  ResourceRefOfType,
  CompiledSubQuery,
  ResourceOfType,
  ResourceTreeOfType,
  ExpandedSchema,
  QueryProps,
  CompiledSubQueryProps,
  QueryRels,
  CompiledSubQueryRels,
  ReplacementResponse,
  Expand,
  ResourceUpdate,
  Writeable,
  ResourceUpdateOfType,
} from "../types";
import {
  asArray, cardinalize, compileQuery, convertDataTreeToResourceTree, formatValidationError, queryTree, toRef,
} from "../utils";
import { validateResource } from "../utils/validate";

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

function makeEmptyUpdatesObj<S extends Schema>(schema: S): NormalizedResourceUpdates<S> {
  const output = {} as NormalizedResourceUpdates<S>;
  Object.keys(schema.resources).forEach((resType: keyof S["resources"]) => {
    output[resType] = {};
  });

  return output;
}

function makeNewResource<S extends Schema, ResType extends keyof S["resources"]>(
  schema: S,
  type: ResType & string,
  id: string,
): ResourceOfType<S, ResType> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const resDef = expandedSchema.resources[type];
  const properties = mapObj(
    resDef.properties,
    (prop) => prop.default ?? undefined,
  );
  const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

  return {
    type,
    id,
    properties,
    relationships,
  } as ResourceOfType<S, ResType>;
}

function toRefStr<S extends Schema>(ref: ResourceRef<S>): string {
  return JSON.stringify({ type: ref.type, id: ref.id });
}

function strToRef<S extends Schema>(refStr: string): ResourceRef<S> {
  return JSON.parse(refStr);
}

type RelatedResource<S extends Schema> = null | ResourceRef<S> | ResourceRef<S>[];
function asRefSet<S extends Schema>(
  resources: RelatedResource<S>,
  fn: (val: Set<string>) => Set<string>,
): ResourceRef<S>[] {
  const set = new Set(asArray(resources).map(toRefStr));
  const nextSet = fn(set);
  return [...nextSet].map(strToRef);
}

export async function makeMemoryStore<S extends Schema>(
  schema: S,
  options: MemoryStoreOptions<S> = {},
): Promise<MemoryStore<S>> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const store: NormalizedResources<S> = makeEmptyStore(schema);
  const baseResources = mapObj(schema.resources, <ResType extends keyof S["resources"]>(resDef, resType: ResType) => {
    const properties = mapObj(
      resDef.properties,
      (prop) => prop.default ?? undefined,
    );
    const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

    return {
      type: resType,
      properties,
      relationships,
    } as ResourceOfType<S, ResType>;
  });

  const applyQuiver = async (
    quiver: ResourceQuiverResult<S>,
  ): Promise<ReplacementResponse<S>> => {
    let allValid = true;
    const allValidationErrors = [];
    const updatedResources: any = makeEmptyUpdatesObj(schema);

    // eslint-disable-next-line no-restricted-syntax
    for (const [ref, value] of quiver.getResources()) {
      const { type, id } = ref;
      type ResType = typeof type;

      if (value == null) {
        updatedResources[type][id] = null;
        continue; // eslint-disable-line no-continue
      }

      const resDef = expandedSchema.resources[type];
      const existingOrNewRes = store[type][id] ?? makeNewResource(schema, type, id);
      const existingOrNewProps = existingOrNewRes.properties;
      const existingOrNewRels = existingOrNewRes.relationships;

      const properties = ("properties" in value)
        ? mapObj(existingOrNewProps, (existingProp, propKey) => value.properties[propKey] ?? existingProp)
        : baseResources[type].properties;

      const relationships = {};
      const updatedRels = quiver.getRelationshipChanges(ref);
      Object.entries(existingOrNewRels).forEach(([relType, existingRels]) => {
        if (relType in updatedRels) {
          const relDef = resDef.relationships[relType];
          const updatedRel = updatedRels[relType];

          if ("present" in updatedRel) {
            relationships[relType] = cardinalize(updatedRel.present, relDef);
          } else {
            const existingRelsOfType = asArray(existingRels);
            const updatedRelIds = new Set(existingRelsOfType.map((r) => r.id));
            (updatedRel.retracted ?? []).forEach((r) => updatedRelIds.delete(r.id));
            (updatedRel.asserted ?? []).forEach((r) => updatedRelIds.add(r.id));

            relationships[relType] = cardinalize(
              [...updatedRelIds].map((relId) => ({ type: relDef.type, id: relId })),
              relDef,
            );
          }
        } else {
          relationships[relType] = existingOrNewRes.relationships[relType];
        }
      });

      const nextRes = {
        type, id, properties, relationships,
      } as ResourceOfType<S, ResType>;

      // eslint-disable-next-line no-await-in-loop
      const { isValid, errors } = await validateResource(expandedSchema, nextRes);

      if (isValid) {
        updatedResources[type][id] = nextRes;
      } else {
        allValid = false;
        allValidationErrors.push(...errors);
      }
    }

    if (!allValid) {
      return { isValid: false, errors: allValidationErrors };
    }

    forEachObj(updatedResources, (ressById, resType) => {
      const untypedStore = store as any;

      forEachObj(ressById, (resValue, resId) => {
        if (resValue === null) {
          delete untypedStore[resType][resId];
        } else {
          // const existingRes = typeStore[resId] || makeEmptyResource(schema, resType, resId);
          // const nextRes = applyResourceUpdate(existingRes, resValue) as ResourceOfType<S, typeof resType>;
          untypedStore[resType][resId] = resValue;
        }
      });
    });

    // eslint-disable-next-line consistent-return
    return {
      isValid: true,
      data: updatedResources,
    };
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

  const getOne = <
    TopResType extends keyof S["resources"],
    Q extends QueryWithId<S, TopResType>,
    QProps extends QueryProps<S, TopResType, Q>,
    QRels extends QueryRels<S, TopResType, Q>,
  >(query: Q & { type: TopResType }, params: QueryParams<S> = {}): Promise<QueryResultResource<S, TopResType, QProps, QRels>> => {
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

  const replaceStep = (tree: ResourceTree<S>, { assertResource, markRelationship }) => {
    assertResource(tree);

    if (tree && ("relationships" in tree)) {
      Object.entries(tree.relationships)
        .forEach(([relType, rels]) => {
          asArray(rels).forEach((subTree) => {
            if ("relationships" in subTree) {
              replaceStep(subTree as ExpandedResourceTree<S>, { assertResource, markRelationship });
            }
          });

          const existing = store[tree.type][tree.id];

          if (existing?.relationships[relType]) {
            asArray(existing.relationships[relType])
              .forEach((related) => markRelationship(relType, existing, related));
          }
        });
    }
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
    const { allResources, rootResource } = queryTree(schema, query, tree);

    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      if (tree === null) {
        retractResource(rootResource);
      } else {
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
