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
} from "../types";
import {
  asArray, compileQuery, convertDataTreeToResourceTree, refsEqual, toRef,
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
    relationships: mapObj(resDef.relationships, (relDef) => (relDef.cardinality === "one" ? null : [])),
  };
}

function cardinalize(rels: ResourceRef[], relDef: CompiledSchemaRelationship):
  ResourceRef | ResourceRef[] {
  return relDef.cardinality === "one"
    ? rels.length === 0 ? null : rels[0]
    : rels;
}

export async function makeMemoryStore(
  schema: CompiledSchema,
  options: MemoryStoreOptions,
): Promise<MemoryStore> {
  let store = makeEmptyStore(schema);

  const applyQuiver = (quiver: ResourceQuiverResult): NormalizedResourceUpdates => {
    const affected = makeEmptyStore(schema);

    // first handle removing stuff, then adding it
    // TODO: validate
    Object.values(quiver.touchedNodes).forEach((nodeOrRef) => {
      const { type, id } = nodeOrRef;

      if (quiver.isRemoved(nodeOrRef)) {
        delete store[type][id];
        affected[type][id] = null;
        return;
      }

      const existingOrNewRes = store[type][id] || makeEmptyResource(schema, type, id);

      // sometimes there are nodes that were identified by the quiver, but could not be marked as
      // added or deleted--these may have had the rels updated, but never their props
      const nextProps = ("properties" in nodeOrRef)
        ? { ...existingOrNewRes.properties, ...nodeOrRef.properties }
        : existingOrNewRes.properties;

      // const allRels = ("relationships" in node) ?
      //   combineRels(existingRes, node.relationships || {})
      //   : existingRes.relationships;

      const nextRels = mapObj(existingOrNewRes.relationships, (existingRels, label) => {
        const relDef = schema.resources[type].relationships[label];
        const normalizedExistingRels = asArray(existingRels);
        const setRefs = quiver.getSetArrowsBySourceAndLabel(nodeOrRef, label);

        if (setRefs) {
          return cardinalize(setRefs.map(toRef), relDef);
        }

        const addedRels = quiver.getAddedArrowsBySourceAndLabel(nodeOrRef, label);
        const removedRels = quiver.getRemovedArrowsBySourceAndLabel(nodeOrRef, label);
        const survivingRels = normalizedExistingRels.filter(
          (rel) => !removedRels.some((removedRef) => refsEqual(rel, removedRef)),
        );
        // console.log({
        //   type, id, label, addedRefs, removedRefs, survivingRefs,
        // });

        return cardinalize([...survivingRels, ...addedRels].map(toRef), relDef);
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
    const quiver = makeResourceQuiver(schema, ({ addResource, removeResource }) => {
      Object.entries(updated).forEach(([type, typedResources]) => {
        Object.entries(typedResources).forEach(([id, updatedRes]) => {
          if (updatedRes === null) {
            removeResource(store[type][id]);
          } else {
            addResource(updatedRes);
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

  const get = async (query: Query, params: QueryParams = {}): Promise<DataTree | DataTree[]> => {
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

    if (query.id) {
      return walk(compiledQuery, compiledQuery);
    }

    // TODO: transduce - lol typescript (could it somehow piggy back on pipe?)
    return Object.values(store[query.type])
      .filter(() => true)
      .map((res) => walk(compiledQuery, res));
  };

  const replaceStep = (tree: ResourceTree, addResource) => {
    addResource(tree);

    if (tree && ("relationships" in tree)) {
      Object.values(tree.relationships)
        .flat()
        .forEach((subTree) => {
          if ("relationships" in subTree) replaceStep(subTree, addResource);
        });
    }
  };

  const replaceMany = async (
    query: Query,
    trees: DataTree[],
    params: QueryParams = {},
  ): Promise<NormalizedResourceUpdates> => {
    console.log("@#$@#_____");
    const compiledQuery = compileQuery(schema, query);
    const resourceTrees = trees.map(
      (tree) => convertDataTreeToResourceTree(schema, compiledQuery, tree),
    );
    console.log(resourceTrees);

    const topLevelQuery = {
      type: query.type,
      id: null,
      properties: [],
      relationships: {},
      referencesOnly: true,
    };
    const refAsStr = (ref: ResourceRef): string => `${ref.type}-${ref.id}`;
    const topLevelRess = await getWithCompiled(topLevelQuery, params);

    const quiver = makeResourceQuiver(schema, ({ addResource, removeResource }) => {
      const possiblyToDelete = keyBy(asArray(topLevelRess), refAsStr);

      resourceTrees.forEach((tree) => {
        replaceStep(tree, addResource);
        delete possiblyToDelete[refAsStr(tree)];
      });

      Object.values(possiblyToDelete).forEach(
        (res) => { removeResource(store[res.type][res.id]); },
      );
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async (query: Query, tree: DataTree) => {
    const compiledQuery = compileQuery(schema, query);
    const resourceTree = convertDataTreeToResourceTree(schema, compiledQuery, tree);

    const quiver = makeResourceQuiver(schema, ({ addResource, removeResource }) => {
      if (tree === null) {
        removeResource(resourceTree);
      } else {
        replaceStep(resourceTree, addResource);
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
