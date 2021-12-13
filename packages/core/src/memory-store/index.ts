/* eslint-disable max-len, no-use-before-define */

import {
  filterObj,
  forEachObj,
  keyBy, mapObj, pick,
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
} from "../types";
import {
  asArray, cardinalize, compileQuery, convertDataTreeToResourceTree, formatValidationError, toRef,
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
  const ResTypes = Object.keys(schema.resources) as (keyof S["resources"])[];
  ResTypes.forEach(
    <ResType extends keyof S["resources"]>(resourceName: ResType) => {
      resources[resourceName] = {} as Record<string, Writeable<ResourceOfType<S, ResType>>>;
    },
  );
  return resources as Writeable<NormalizedResources<S>>;
}

function makeEmptyUpdatesObj<S extends Schema>(schema: S): NormalizedResourceUpdates<S> {
  return mapObj(schema.resources, () => ({})) as NormalizedResourceUpdates<S>;
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
  };
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
  const store = makeEmptyStore(schema);

  const applyQuiver = async (
    quiver: ResourceQuiverResult<S>,
  ): Promise<ReplacementResponse<S>> => {
    let allValid = true;
    const allValidationErrors = [];
    const resUpdates = makeEmptyStore(schema);
    console.log(quiver.getResources())

    // eslint-disable-next-line no-restricted-syntax
    for (const [ref, value] of quiver.getResources()) {
      const { type, id } = ref;
      type ResType = typeof type;

      if (value == null) {
        const typeAffected = resUpdates[type] as Record<string, null>;
        typeAffected[id] = null;
        continue; // eslint-disable-line no-continue
      }

      const existingOrNewRes = store[type][id] ?? makeNewResource(schema, type, id);

      const changedProps = ("properties" in value)
        ? filterObj(value.properties, (newVal, key: string) => existingOrNewRes[key] !== newVal)
        : {};

      const changedQuiverRelationships = quiver.getRelationshipChanges(ref);

      // TODO: Apply new rel change format
      const changedRels = mapObj(changedQuiverRelationships, (relsToChange, relType) => {
        const relDef = schema.resources[type].relationships[relType];
        if ("present" in relsToChange) {
          return cardinalize(
            [...relsToChange.present].map((relStr) => JSON.parse(relStr)),
            relDef,
          );
        }

        const newRelSet = asRefSet(existingOrNewRes.relationships[relType], (relSet) => {
          Object.entries(relsToChange.changes).forEach(([relRef, keep]) => {
            if (keep) {
              relSet.add(relRef);
            } else {
              relSet.delete(relRef);
            }
          });

          return relSet;
        });

        return cardinalize([...newRelSet].map(toRef), relDef);
      });

      const hasPropChanges = Object.keys(changedProps).length > 0;
      const hasRelChanges = Object.keys(changedQuiverRelationships).length > 0;
      const isNewResource = !store[type][id];

      if (hasPropChanges || hasRelChanges || isNewResource) {
        const nextRes = {
          type,
          id,
          properties: { ...existingOrNewRes.properties, ...changedProps },
          relationships: { ...existingOrNewRes.relationships, ...changedRels },
        };

        // eslint-disable-next-line no-await-in-loop
        const { isValid, errors } = await validateResource(expandedSchema, nextRes);

        if (isValid) {
          const typeAffected = resUpdates[type] as Record<string, ResourceUpdate<S, ResType, ResourceOfType<S, ResType>>>;
          typeAffected[id] = nextRes;
        } else {
          allValid = false;
          allValidationErrors.push(...errors);
        }
      }
    }

    if (!allValid) {
      return { isValid: false, errors: allValidationErrors };
    }

    forEachObj(resUpdates, (ressById, resType) => {
      const typeStore = store[resType] as Record<string, ResourceOfType<S, typeof resType>>;

      forEachObj(ressById, (resValue, resId) => {
        if (resValue === null) {
          delete typeStore[resId];
        } else {
          // const existingRes = typeStore[resId] || makeEmptyResource(schema, resType, resId);
          // const nextRes = applyResourceUpdate(existingRes, resValue) as ResourceOfType<S, typeof resType>;
          typeStore[resId] = resValue;
        }
      });
    });

    // eslint-disable-next-line consistent-return
    return {
      isValid: true,
      data: resUpdates,
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
            assertResource(updatedRes as ResourceOfType<S, typeof type>);
          }
        });
      });
    });

    return applyQuiver(quiver);
  };

  const getWithCompiled = async <TopResType extends keyof S["resources"]>(
    compiledQuery: CompiledQuery<S, TopResType & string>,
    params: QueryParams<S> = {},
  ): Promise<ResourceTreeOfType<S, TopResType> | ResourceTreeOfType<S, TopResType>[]> => {
    const walk = <ResType extends keyof S["resources"]>(
      subQuery: CompiledSubQuery<S, ResType>,
      ref: ResourceRefOfType<S, ResType>,
    ): ResourceTreeOfType<S, ResType> => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return {
          type, id, relationships: {}, properties: {},
        };
      }

      const expanededRels = mapObj(
        subQuery.relationships,
        (relQuery, relName) => {
          const rels = asArray(resource.relationships[relName]);
          return rels.map((rel) => walk(relQuery, rel));
        },
      );

      return {
        id,
        type,
        properties: resource.properties,
        relationships: expanededRels,
      };
    };

    if (compiledQuery.id) {
      return { id: compiledQuery.id, ...walk(compiledQuery, compiledQuery) };
    }

    // TODO: transduce
    return Object.values(store[compiledQuery.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));
  };

  const getOne = <
    TopResType extends keyof S["resources"],
    Q extends QueryWithId<S, TopResType>,
    QProps extends QueryProps<S, TopResType, Q>,
    QRels extends QueryRels<S, TopResType, Q>,
  >(query: Q & { type: TopResType }, params: QueryParams<S> = {}): Promise<QueryResultResource<S, TopResType, QProps, QRels>> => {
    const compiledQuery = compileQuery(schema, query);

    const walk = <
      ResType extends keyof S["resources"],
      CSQ extends CompiledSubQuery<S, ResType>,
      CSQProps extends CompiledSubQueryProps<S, ResType, CSQ>,
      CSQRels extends CompiledSubQueryRels<S, ResType, CSQ>,
    >(
        compiledSubQuery: CSQ,
        ref: ResourceRefOfType<S, ResType>,
      ): QueryResultResource<S, ResType, CSQProps, CSQRels> => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (compiledSubQuery.referencesOnly === true) {
        return { type, id } as QueryResultResource<S, ResType, CSQProps, CSQRels>;
      }

      const properties = pick(resource.properties, compiledSubQuery.properties);

      const expandedRels = mapObj(compiledSubQuery.relationships, (relQuery, relName) => {
        const relDef = schema.resources[type].relationships[relName];
        const rels = asArray(resource.relationships[relName]);
        const expanded = rels.map((rel) => walk(relQuery, rel));

        return relDef.cardinality === "one"
          ? (expanded.length === 0 ? null : expanded[0])
          : expanded;
      });

      return {
        id,
        type,
        ...properties,
        ...expandedRels,
      } as QueryResultResource<S, ResType, CSQProps, CSQRels>;
    };

    const out = walk(compiledQuery, compiledQuery);
    return Promise.resolve(out);
  };

  const getMany = <
    TopResType extends keyof S["resources"],
    Q extends Query<S, TopResType>
  >(
      query: Q,
      params: QueryParams<S>,
    ): Promise<QueryResultResource<S, TopResType>[]> => {
    const compiledQuery = compileQuery(schema, query);

    const walk = <ResType extends keyof S["resources"], SQ extends CompiledSubQuery<S, ResType>>(
      subQuery: SQ,
      ref: ResourceRefOfType<S, ResType>,
    ): QueryResultResource<S, ResType> => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return { type, id } as QueryResultResource<S, ResType>;
      }

      const expandedRels = mapObj(
        subQuery.relationships,
        <RelType extends keyof S["resources"][ResType]["relationships"]>(relQuery, relName: RelType) => {
          const relDef = schema.resources[type].relationships[relName as string];
          const rels = asArray(resource.relationships[relName]);
          const expanded = rels.map((rel) => walk(relQuery, rel));

          return relDef.cardinality === "one"
            ? (expanded.length === 0 ? null : expanded[0])
            : expanded;
        },
      );

      return {
        id,
        type,
        ...resource.properties,
        ...expandedRels,
      } as QueryResultResource<S, ResType>;
    };

    const allResources = Object.values(store[query.type]);
    const results = allResources.map((res) => walk(compiledQuery, res));

    const out = Promise.resolve(
      results as QueryResultResource<S, TopResType>[],
    );

    return out;
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
    const compiledQuery = compileQuery(schema, query);
    const resourceTrees = trees.map(
      (tree) => convertDataTreeToResourceTree(schema, compiledQuery, tree),
    );

    const topLevelResourcesQuery = {
      type: query.type,
      id: null,
      properties: [],
      relationships: {},
      referencesOnly: true,
    } as const;
    const refAsStr = (ref: ResourceRef<S>): string => `${ref.type}-${ref.id}`;
    const topLevelResources = await getWithCompiled(topLevelResourcesQuery, params);

    const quiver = makeResourceQuiver(schema, (quiverMethods) => {
      const possiblyToDelete = keyBy(asArray(topLevelResources), refAsStr);

      resourceTrees.forEach((tree) => {
        replaceStep(tree, quiverMethods);
        delete possiblyToDelete[refAsStr(tree)];
      });

      Object.values(possiblyToDelete).forEach(
        (res) => { quiverMethods.retractResource(store[res.type][res.id]); },
      );
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async <TopResType extends keyof S["resources"], Q extends QueryWithId<S, TopResType & string>>(
    query: Q,
    tree: DataTree,
  ): Promise<ReplacementResponse<S>> => {
    const compiledQuery = compileQuery(schema, query);
    const resourceTree = convertDataTreeToResourceTree(schema, compiledQuery, tree);
    console.log(tree)

    const quiver = makeResourceQuiver(schema, (quiverMethods) => {
      if (tree === null) {
        quiverMethods.retractResource(resourceTree);
      } else {
        replaceStep(resourceTree, quiverMethods);
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
