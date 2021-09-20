import {
  keyBy, mapObj,
} from "../../../utils/dist";
import { makeResourceQuiver, ResourceQuiverResult } from "../data-structures/resource-quiver";
import {
  CompiledSchema,
  ResourceTree,
  NormalizedResources,
  NormalizedResourceUpdates,
  PolygraphStore,
  Query,
  QueryParams,
  Resource,
  CompiledQuery,
  ResourceRef,
  DataTree,
  CompiledSchemaRelationship,
  GetFn,
  QueryWithoutId,
  QueryWithId,
  Schema,
} from "../types";
import {
  asArray, compileQuery, convertDataTreeToResourceTree, toRef,
} from "../utils";

interface MemoryStore extends PolygraphStore {
  replaceResources: (updates: NormalizedResourceUpdates) => Promise<NormalizedResources>;
}

interface MemoryStoreOptions {
  initialData?: NormalizedResources;
}

/**
 * TODOS:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */

function makeEmptyStore<S extends Schema>(schema: CompiledSchema<S>): NormalizedResources {
  const resources: NormalizedResources = {};
  Object.keys(schema.resources).forEach((resourceName) => { resources[resourceName] = {}; });
  return resources;
}

function makeEmptyResource<S extends Schema>(
  schema: CompiledSchema<S>,
  type: string,
  id: string,
): Resource {
  const resDef = schema.resources[type];

  return {
    type,
    id,
    properties: mapObj(resDef.properties, () => undefined),
    relationships: mapObj(resDef.relationships, (relDef) => (relDef.cardinality === "one" ? null : [])),
  };
}

function toRefStr(ref: ResourceRef): string {
  return JSON.stringify({ type: ref.type, id: ref.id });
}

function strToRef(refStr: string): ResourceRef {
  return JSON.parse(refStr);
}

function cardinalize<S extends Schema>(rels: ResourceRef[], relDef: CompiledSchemaRelationship<S>):
  ResourceRef | ResourceRef[] {
  return relDef.cardinality === "one"
    ? rels.length === 0 ? null : rels[0]
    : rels;
}

type RelatedResource = null | ResourceRef | ResourceRef[];
function asRefSet(
  resources: RelatedResource,
  fn: (val: Set<string>) => Set<string>,
): ResourceRef[] {
  const set = new Set(asArray(resources).map(toRefStr));
  const nextSet = fn(set);
  return [...nextSet].map(strToRef);
}

export async function makeMemoryStore<S extends Schema>(
  schema: CompiledSchema<S>,
  options: MemoryStoreOptions,
): Promise<MemoryStore> {
  let store = makeEmptyStore(schema);

  const applyQuiver = (quiver: ResourceQuiverResult): NormalizedResourceUpdates => {
    const affected = makeEmptyStore(schema);

    // first handle removing stuff, then adding it
    // TODO: validate
    // eslint-disable-next-line no-restricted-syntax
    for (const [ref, value] of quiver.getResources()) {
      const { type, id } = ref;

      if (value == null) {
        delete store[type][id];
        affected[type][id] = null;
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
        store[type][id] = nextRes;
        affected[type][id] = nextRes;
      }
    }

    // eslint-disable-next-line consistent-return
    return affected;
  };

  const replaceResources = async (updated: NormalizedResourceUpdates) => {
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      Object.entries(updated).forEach(([type, typedResources]) => {
        Object.entries(typedResources).forEach(([id, updatedRes]) => {
          if (updatedRes === null) {
            retractResource(store[type][id]);
          } else {
            assertResource(updatedRes);
          }
        });
      });
    });

    return applyQuiver(quiver);
  };

  const getWithCompiled = async (
    compiledQuery: CompiledQuery, params: QueryParams = {},
  ) : Promise<ResourceTree | ResourceTree[]> => {
    const walk = (subQuery: CompiledQuery, ref: ResourceRef): ResourceTree => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return {
          type, id, relationships: {}, properties: {},
        };
      }

      const expanededRels = mapObj(subQuery.relationships, (relQuery, relName) => {
        const rels = asArray(resource.relationships[relName]);
        return rels.map((rel) => walk(relQuery, rel));
      });

      return {
        id,
        type,
        properties: resource.properties,
        relationships: expanededRels,
      };
    };

    if (compiledQuery.id) {
      return walk(compiledQuery, compiledQuery);
    }

    // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
    return Object.values(store[compiledQuery.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));
  };

  const get = ((query: QueryWithoutId | QueryWithId, params: QueryParams = {}) => {
    const compiledQuery = compileQuery(schema, query);

    const walk = (subQuery: CompiledQuery, ref: ResourceRef): DataTree => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;
      if (subQuery.referencesOnly === true) {
        return { type, id };
      }

      const expandedRels = mapObj(subQuery.relationships, (relQuery, relName) => {
        const relDef = schema.resources[type].relationships[relName];
        const rels = asArray(resource.relationships[relName]);
        const expanded = rels.map((rel) => walk(relQuery, rel));

        return relDef.cardinality === "one"
          ? (expanded.length === 0 ? null : expanded[0])
          : expanded;
      });

      return {
        id, type, ...resource.properties, ...expandedRels,
      };
    };

    if ("id" in query) {
      const out = Promise.resolve(walk(compiledQuery, compiledQuery));
      return out;
    }

    // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
    const results = Object.values(store[query.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));

    const out = Promise.resolve(results);
    return out;
  }) as GetFn;

  const replaceStep = (tree: ResourceTree, { assertResource, markRelationship }) => {
    assertResource(tree);

    if (tree && ("relationships" in tree)) {
      Object.entries(tree.relationships)
        .forEach(([relType, rels]) => {
          rels.forEach((subTree) => {
            if ("relationships" in subTree) replaceStep(subTree, { assertResource, markRelationship });
          });

          const existing = store[tree.type][tree.id];

          if (existing?.relationships[relType]) {
            asArray(existing.relationships[relType])
              .forEach((related) => markRelationship(relType, existing, related));
          }
        });
    }
  };

  const replaceMany = async (
    query: Query,
    trees: DataTree[],
    params: QueryParams = {},
  ): Promise<NormalizedResourceUpdates> => {
    console.log("\n\n@#$@#_____-MANY\n\n");
    const compiledQuery = compileQuery(schema, query);
    const resourceTrees = trees.map(
      (tree) => convertDataTreeToResourceTree(schema, compiledQuery, tree),
    );

    const topLevelQuery = {
      type: query.type,
      id: null,
      properties: [],
      relationships: {},
      referencesOnly: true,
    };
    const refAsStr = (ref: ResourceRef): string => `${ref.type}-${ref.id}`;
    const topLevelRess = await getWithCompiled(topLevelQuery, params);

    const quiver = makeResourceQuiver(schema, (quiverMethods) => {
      const possiblyToDelete = keyBy(asArray(topLevelRess), refAsStr);

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

  const replaceOne = async (query: Query, tree: DataTree) => {
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

  store = await replaceResources(options.initialData);

  return {
    get,
    replaceOne,
    replaceMany,
    replaceResources,
  };
}
