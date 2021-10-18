/* eslint-disable max-len, no-use-before-define */

import {
  keyBy, mapObj,
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
  QueryResult,
  QueryWithId,
  ResourceRefOfType,
  QueryWithoutId,
  CompiledSubQuery,
  ResourceOfType,
  ResourceTreeOfType,
  ExpandedSchema,
  SubQueryResult,
} from "../types";
import {
  asArray, cardinalize, compileQuery, convertDataTreeToResourceTree, toRef,
} from "../utils";

interface MemoryStoreOptions<S extends Schema> {
  initialData?: NormalizedResourceUpdates<S>;
}

/**
 * TODOS:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */
function makeEmptyStore<S extends Schema>(schema: S): NormalizedResources<S> {
  const resources = {} as Record<keyof S["resources"], Record<string, ResourceOfType<S, keyof S["resources"]>>>;
  const ResTypes = Object.keys(schema.resources) as (keyof S["resources"])[];
  ResTypes.forEach(
    <ResType extends keyof S["resources"]>(resourceName: ResType) => {
      resources[resourceName] = {} as Record<string, ResourceOfType<S, ResType>>;
    },
  );
  return resources as NormalizedResources<S>;
}

type GetKeys<U> = U extends Record<infer K, any> ? K : never
type UnionToIntersection<U extends Record<string, unknown>> = {
   [K in GetKeys<U>]: U extends Record<K, infer T> ? T : never
}

function makeEmptyResource<S extends Schema, ResType extends keyof S["resources"]>(
  schema: S,
  type: ResType & string,
  id: string,
): ResourceOfType<S, ResType> {
  const expandedSchema = schema as ExpandedSchema<S>;
  const resDef = expandedSchema.resources[type];
  const properties = mapObj(resDef.properties, () => undefined);
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
  options: MemoryStoreOptions<S>,
): Promise<MemoryStore<S>> {
  const store = makeEmptyStore(schema);
  const expandedSchema = schema as ExpandedSchema<S>;
  type XS = ExpandedSchema<S>;

  const applyQuiver = (
    quiver: ResourceQuiverResult<S>,
  ): NormalizedResourceUpdates<S> => {
    const affected = makeEmptyStore(schema) as NormalizedResourceUpdates<S>;

    // first handle removing stuff, then adding it
    // TODO: validate
    // eslint-disable-next-line no-restricted-syntax
    for (const [ref, value] of quiver.getResources()) {
      const { type, id } = ref;
      type ResType = typeof type;
      type ResOfType = ResourceOfType<S, ResType>;

      if (value == null) {
        delete store[type][id];
        const typeAffected = affected[type] as Record<string, ResOfType | null>;
        typeAffected[id] = null;
        continue; // eslint-disable-line no-continue
      }

      const existingOrNewRes = store[type][id] || makeEmptyResource(schema, type, id);

      // sometimes there are nodes that were identified by the quiver, but could not be marked as
      // added or deleted--these may have had the rels updated, but never their props
      const nextProps = ("properties" in value)
        ? { ...existingOrNewRes.properties, ...value.properties }
        : existingOrNewRes.properties;

      const hasPropChanges = ("properties" in value)
        && Object.entries(value.properties)
          .some(([name, newValue]) => existingOrNewRes[name] !== newValue);

      const changedRelationships = quiver.getRelationshipChanges(ref);
      const hasRelChanges = Object.keys(changedRelationships).length > 0;

      // TODO: Apply new rel change format
      const changedRels = mapObj(changedRelationships, (relsToChange, relType) => {
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

      const nextRes = {
        type,
        id,
        properties: nextProps,
        relationships: { ...existingOrNewRes.relationships, ...changedRels },
      };

      if (hasPropChanges || hasRelChanges) {
        // TS ugliness...
        const typeStore = store[type] as Record<string, ResOfType>;
        typeStore[id] = nextRes;

        const typeAffected = affected[type] as Record<string, ResOfType>;
        typeAffected[id] = nextRes;
      }
    }

    // eslint-disable-next-line consistent-return
    return affected;
  };

  const replaceResources = async (updated: NormalizedResourceUpdates<S>) => {
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

    // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
    return Object.values(store[compiledQuery.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));
  };

  // const get = (query: Query, params: QueryParams = {}) => {
  //   const compiledQuery = compileQuery(schema, query);

  //   const walk = <ResType extends keyof S["resources"]>(
  //     subQuery: CompiledQuery<S, ResType>,
  //     ref: ResourceRef<S>,
  //   ): DataTree => {
  //     const { type, id } = ref;
  //     const resource = store[type][id];

  //     if (!resource) return null;
  //     if (subQuery.referencesOnly === true) {
  //       return { type, id };
  //     }

  //     const expandedRels = mapObj(subQuery.relationships, (relQuery, relName) => {
  //       const relDef = schema.resources[type].relationships[relName];
  //       const rels = asArray(resource.relationships[relName]);
  //       const expanded = rels.map((rel) => walk(relQuery, rel));

  //       return relDef.cardinality === "one"
  //         ? (expanded.length === 0 ? null : expanded[0])
  //         : expanded;
  //     });

  //     return {
  //       id, type, ...resource.properties, ...expandedRels,
  //     };
  //   };

  //   if ("id" in query) {
  //     const out = Promise.resolve(walk(compiledQuery, compiledQuery));
  //     return out;
  //   }

  //   // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
  //   const results = Object.values(store[query.type])
  //     .filter(() => true)
  //     .map((res) => walk(compiledQuery, res));

  //   const out = Promise.resolve(results);
  //   return out;
  // };

  const getOne = <TopResType extends keyof S["resources"], Q extends QueryWithId<S, TopResType & string>>(
    query: Q,
    params: QueryParams<S> = {},
  ): Promise<QueryResult<S, Q, TopResType & string>> => {
    const compiledQuery = compileQuery(schema, query);

    const walk = <ResType extends keyof S["resources"], SQ extends CompiledSubQuery<S, ResType>>(
      subQuery: SQ,
      ref: ResourceRefOfType<S, ResType>,
    ): SubQueryResult<S, SQ, ResType> => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return { type, id } as SubQueryResult<S, SQ, ResType>;
      }

      const expandedRels = mapObj(subQuery.relationships, (relQuery, relName) => {
        const relDef = schema.resources[type].relationships[relName as string];
        const rels = asArray(resource.relationships[relName]);
        const expanded = rels.map((rel) => walk(relQuery, rel));

        return relDef.cardinality === "one"
          ? (expanded.length === 0 ? null : expanded[0])
          : expanded;
      });

      return {
        id,
        type,
        ...resource.properties,
        ...expandedRels,
      } as SubQueryResult<S, SQ, ResType>;
    };

    const out = Promise.resolve(
      walk(compiledQuery, compiledQuery) as QueryResult<S, Q, TopResType>,
    );

    return out;
  };

  const getMany = <
    TopResType extends keyof S["resources"],
    Q extends QueryWithoutId<S, TopResType>
  >(
      query: Q,
      params: QueryParams<S>,
    ): Promise<QueryResult<S, Q, TopResType>[]> => {
    const compiledQuery = compileQuery(schema, query);

    const walk = <ResType extends keyof S["resources"], SQ extends CompiledSubQuery<S, ResType>>(
      subQuery: SQ,
      ref: ResourceRefOfType<S, ResType>,
    ): QueryResult<S, SQ, ResType> => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return { type, id } as QueryResult<S, SQ, ResType>;
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
      } as QueryResult<S, ResType, any>;
    };

    const allResources = Object.values(store[query.type]);
    const results = allResources.map((res) => walk(compiledQuery, res));

    const out = Promise.resolve(
      results as QueryResult<S, TopResType, any>[],
    );

    return out;
  };

  const get = <ResType extends keyof S["resources"], Q extends Query<S, ResType>>(
    query: Q,
    params: QueryParams<S>,
  ): "id" extends keyof Q ? Promise<QueryResult<S, ResType, any>> : Promise<QueryResult<S, ResType, any>[]> => {
    const out = ("id" in query)
      ? getOne(query as QueryWithId<S, ResType>, params)
      : getMany(query as QueryWithoutId<S, ResType>, params);

    return out as "id" extends keyof Q ? Promise<QueryResult<S, ResType, any>> : Promise<QueryResult<S, ResType, any>[]>;
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

  const replaceMany = async <TopResType extends keyof S["resources"], Q extends QueryWithoutId<S, TopResType & string>>(
    query: Q,
    trees: DataTree[],
    params: QueryParams<S> = {},
  ): Promise<NormalizedResourceUpdates<S>> => {
    console.log("\n\n@#$@#_____-MANY\n\n");
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
  ) => {
    console.log("\n\n@#$@#___########__-ONE\n\n");
    const compiledQuery = compileQuery(schema, query);
    const resourceTree = convertDataTreeToResourceTree(schema, compiledQuery, tree);

    const quiver = makeResourceQuiver(schema, (quiverMethods) => {
      if (tree === null) {
        quiverMethods.retractResource(resourceTree);
      } else {
        replaceStep(resourceTree, quiverMethods);
      }
    });

    return applyQuiver(quiver);
  };

  await replaceResources(options.initialData);

  return {
    get,
    replaceOne,
    replaceMany,
    replaceResources,
  } as MemoryStore<S>;
}
