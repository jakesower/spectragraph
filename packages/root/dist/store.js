import { createQueryGraph, emptyGraph, linkInverses, mergeGraphs, } from "./graph.js";
import { normalizeResources } from "./mappers.js";
export { createQueryGraph, queryGraph } from "./graph/query.js";
export function createStore(schema, initialData = {}) {
    let queryGraph;
    let storeGraph = mergeGraphs(emptyGraph(schema), initialData);
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
        const graph = normalizeResources(resourceType, trees, schema, mappers);
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
