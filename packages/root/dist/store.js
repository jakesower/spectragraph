import { v4 as uuidv4 } from "uuid";
import { createQueryGraph, createEmptyGraph, linkInverses, mergeGraphs, } from "./graph.js";
import { createGraphFromTrees } from "./mappers.js";
import { createOrUpdate } from "./create-or-update.js";
import { mapValues } from "lodash-es";
import { deleteAction } from "./delete.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export function createMemoryStore(schema, initialData = {}) {
    let queryGraph;
    let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);
    const runQuery = (query) => {
        if (!queryGraph)
            queryGraph = createQueryGraph(storeGraph);
        return queryGraph.query(query);
    };
    // WARNING: MUTATES storeGraph
    const create = (resource) => {
        const { id, type } = resource;
        const resSchema = schema.resources[resource.type];
        const normalRes = {
            attributes: resource.attributes ?? {},
            relationships: mapValues(resSchema.relationships, (rel, relName) => resource.relationships?.[relName] ??
                (rel.cardinality === "one" ? null : [])),
            id: id ?? uuidv4(),
            type,
        };
        queryGraph = null;
        return createOrUpdate(normalRes, { schema, storeGraph });
    };
    // WARNING: MUTATES storeGraph
    const update = (resource) => {
        const resSchema = schema.resources[resource.type];
        const existingRes = storeGraph[resource.type][resource.id];
        const normalRes = {
            ...resource,
            attributes: mapValues(resSchema.attributes, (_, attrName) => resource.attributes?.[attrName] ?? existingRes.attributes[attrName]),
            relationships: mapValues(resSchema.relationships, (rel, relName) => resource.relationships?.[relName] ??
                (rel.cardinality === "one" ? null : [])),
        };
        // WARNING: MUTATES storeGraph
        queryGraph = null;
        return createOrUpdate(normalRes, { schema, storeGraph });
    };
    const delete_ = (resource) => {
        queryGraph = null;
        return deleteAction(resource, { schema, storeGraph });
    };
    const merge = (graph) => {
        queryGraph = null;
        storeGraph = mergeGraphs(storeGraph, graph);
    };
    const mergeTrees = (resourceType, trees, mappers = {}) => {
        const graph = createGraphFromTrees(resourceType, trees, schema, mappers);
        merge(graph);
    };
    const mergeTree = (resourceType, tree, mappers = {}) => {
        mergeTrees(resourceType, [tree], mappers);
    };
    const linkStoreInverses = () => {
        queryGraph = null;
        storeGraph = linkInverses(storeGraph, schema);
    };
    return {
        linkInverses: linkStoreInverses,
        create,
        update,
        delete: delete_,
        merge,
        mergeTree,
        mergeTrees,
        query: runQuery,
    };
}
