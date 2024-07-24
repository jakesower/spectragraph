import { createQueryGraph, createEmptyGraph, linkInverses, mergeGraphs, } from "./graph.js";
import { createGraphFromTrees } from "./mappers.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export function createMemoryStore(schema, initialData = {}) {
    let queryGraph;
    let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);
    const runQuery = (query) => {
        if (!queryGraph)
            queryGraph = createQueryGraph(storeGraph);
        return queryGraph.query(query);
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
        merge,
        mergeTree,
        mergeTrees,
        query: runQuery,
    };
}
