import {
  keyBy, mapObj,
} from "../../../utils/dist";
import { makeResourceQuiver, ResourceQuiver } from "../data-structures/resource-quiver";
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
} from "../types";
import {
  asArray, compileQuery, convertDataTreeToResourceTree, refsEqual,
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

function makeEmptyStore(schema: CompiledSchema): NormalizedResources {
  const resources: NormalizedResources = {};
  Object.keys(schema.resources).forEach((resourceName) => { resources[resourceName] = {}; });
  return resources;
}

function makeEmptyResource(schema: CompiledSchema, type: string, id: string): Resource {
  const resDef = schema.resources[type];

  return {
    type,
    id,
    properties: mapObj(resDef.properties, () => undefined),
    relationships: mapObj(resDef.relationships, () => []),
  };
}

export async function makeMemoryStore(
  schema: CompiledSchema, options: MemoryStoreOptions,
): Promise<MemoryStore> {
  let store = makeEmptyStore(schema);

  const applyQuiver = (quiver: ResourceQuiver): NormalizedResourceUpdates => {
    const affected = makeEmptyStore(schema);

    Object.values(quiver.touchedNodes).forEach(({ type, id }) => {
      affected[type][id] = store[type][id] || null;
    });

    // first handle removing stuff, then adding it
    // TODO: validate
    Object.values(quiver.removedNodes).forEach(({ type, id }) => {
      delete store[type][id];
      affected[type][id] = null;
    });

    need to add logic in for updating the relationships of *TOUCHED* nodes!

    Object.values(quiver.addedNodes).forEach((node) => {
      const { type, id } = node;
      const existingRes = store[type][id] || makeEmptyResource(schema, type, id);
      const nextProps = { ...existingRes.properties, ...node.properties };

      const nextRels = mapObj(existingRes.relationships, (existingRels, label) => {
        const setRefs = quiver.getSetArrowsBySourceAndLabel(node, label);
        if (setRefs) return setRefs;

        const addedRefs = quiver.getAddedArrowsBySourceAndLabel(node, label);
        const removedRefs = quiver.getRemovedArrowsBySourceAndLabel(node, label);
        const survivingRefs = existingRels.filter(
          (rel) => !removedRefs.some((removedRef) => refsEqual(rel, removedRef)),
        );

        return [...survivingRefs, ...addedRefs];
      });

      const nextRes = {
        type, id, properties: nextProps, relationships: nextRels,
      };

      store[type][id] = nextRes;
      affected[type][id] = nextRes;
    });

    return affected;
  };

  const replaceResources = async (updated: NormalizedResourceUpdates) => {
    // build up a quiver of changes, checking for inconsistencies (mutate for performance)
    const quiver = makeResourceQuiver(schema);

    Object.entries(updated).forEach(([type, typedResources]) => {
      Object.entries(typedResources).forEach(([id, updatedRes]) => {
        if (updatedRes === null) {
          quiver.removeResource(store[type][id]);
        } else {
          quiver.addResource(updatedRes);
        }
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

      const expanededRels = mapObj(subQuery.relationships, (relQuery, relName) => {
        const rels = resource.relationships[relName];
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

  const get = async (query: Query, params: QueryParams = {}): Promise<DataTree | DataTree[]> => {
    const compiledQuery = compileQuery(schema, query);

    const walk = (subQuery: CompiledQuery, ref: ResourceRef): DataTree => {
      const { type, id } = ref;
      const resource = store[type][id];

      if (!resource) return null;

      const expanededRels = mapObj(subQuery.relationships, (relQuery, relName) => {
        const relDef = schema.resources[type].relationships[relName];
        const rels = resource.relationships[relName];
        const expanded = rels.map((rel) => walk(relQuery, rel));

        return relDef.cardinality === "one"
          ? (expanded.length === 0 ? null : expanded[0])
          : expanded;
      });

      return {
        id, type, ...resource.properties, ...expanededRels,
      };
    };

    if (query.id) {
      return walk(compiledQuery, compiledQuery);
    }

    // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
    return Object.values(store[query.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));
  };

  const replaceStep = (tree: ResourceTree, quiver: ResourceQuiver) => {
    quiver.addResource(tree);
    Object.values(tree.relationships).flat().forEach((subTree) => replaceStep(subTree, quiver));
  };

  const replaceMany = async (
    query: Query,
    trees: DataTree[],
    params: QueryParams = {},
  ): Promise<NormalizedResourceUpdates> => {
    const compiledQuery = compileQuery(schema, query);
    const resourceTrees = trees.map(
      (tree) => convertDataTreeToResourceTree(schema, compiledQuery, tree),
    );
    const quiver = makeResourceQuiver(schema);

    const topLevelQuery = {
      type: query.type,
      id: null,
      properties: [],
      relationships: {},
    };

    const refAsStr = (ref: ResourceRef): string => `${ref.type}-${ref.id}`;
    const topLevelRess = await getWithCompiled(topLevelQuery, params);
    const possiblyToDelete = keyBy(asArray(topLevelRess), refAsStr);

    resourceTrees.forEach((tree) => {
      replaceStep(tree, quiver);
      delete possiblyToDelete[refAsStr(tree)];
    });

    Object.values(possiblyToDelete).forEach(
      (res) => { quiver.removeResource(store[res.type][res.id]); },
    );

    return applyQuiver(quiver);
  };

  const replaceOne = async (query: Query, tree: DataTree) => {
    const compiledQuery = compileQuery(schema, query);
    const resourceTree = convertDataTreeToResourceTree(schema, compiledQuery, tree);

    const quiver = makeResourceQuiver(schema);
    if (tree === null) {
      quiver.removeResource(resourceTree);
    } else {
      replaceStep(resourceTree, quiver);
    }

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
