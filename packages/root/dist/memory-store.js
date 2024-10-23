import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import { createQueryGraph, createEmptyGraph, linkInverses, mergeGraphs, } from "./graph.js";
import { createGraphFromTrees } from "./mappers.js";
import { createOrUpdate } from "./create-or-update.js";
import { deleteAction } from "./delete.js";
import { ensureValidQuery } from "./query.js";
import { defaultValidator, validateCreateResource, validateDeleteResource, validateUpdateResource, } from "./validate.js";
import { splice } from "./splice.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export function createMemoryStore(schema, config = {}) {
    const { initialData = {}, validator = defaultValidator } = config;
    let queryGraph;
    let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);
    const runQuery = (query) => {
        if (!queryGraph)
            queryGraph = createQueryGraph(storeGraph);
        ensureValidQuery(schema, query);
        return queryGraph.query(query);
    };
    // WARNING: MUTATES storeGraph
    const create = (resource) => {
        const { id, type } = resource;
        const resSchema = schema.resources[resource.type];
        const { idAttribute = "id" } = resSchema;
        const newId = id ?? uuidv4();
        const errors = validateCreateResource(schema, resource, validator);
        if (errors.length > 0)
            throw new Error("invalid resource", { cause: errors });
        const normalRes = {
            attributes: { ...(resource.attributes ?? {}), [idAttribute]: newId },
            relationships: mapValues(resSchema.relationships, (rel, relName) => resource.relationships?.[relName] ??
                (rel.cardinality === "one" ? null : [])),
            id: newId,
            type,
        };
        queryGraph = null;
        return createOrUpdate(normalRes, { schema, storeGraph });
    };
    // WARNING: MUTATES storeGraph
    const update = (resource) => {
        const errors = validateUpdateResource(schema, resource, validator);
        if (errors.length > 0)
            throw new Error("invalid resource", { cause: errors });
        const existingRes = storeGraph[resource.type][resource.id];
        const normalRes = {
            ...resource,
            attributes: { ...existingRes.attributes, ...resource.attributes },
            relationships: {
                ...existingRes.relationships,
                ...resource.relationships,
            },
        };
        // WARNING: MUTATES storeGraph
        queryGraph = null;
        return createOrUpdate(normalRes, { schema, storeGraph });
    };
    const delete_ = (resource) => {
        const errors = validateDeleteResource(schema, resource, validator);
        if (errors.length > 0)
            throw new Error("invalid resource", { cause: errors });
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
        getOne(type, id) {
            return storeGraph[type][id] ?? null;
        },
        create,
        update,
        delete: delete_,
        merge,
        mergeTree,
        mergeTrees,
        query: runQuery,
        splice(resource) {
            return splice(schema, resource, validator, this);
        },
    };
}
