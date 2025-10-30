import { buildResource, mergeResources } from "@spectragraph/core";
import { setInverseRelationships } from "./lib/store-helpers.js";

/**
 * Creates a new resource in the store and sets up all inverse relationships.
 * Generates an ID if not provided and merges with schema defaults.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@spectragraph/core').CreateResource} resource - The resource to create
 * @param {import('./memory-store.js').MemoryStoreContext} context - Context object containing schema and storeGraph
 * @returns {import('@spectragraph/core').NormalResource} The created resource
 */
export function create(resource, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;

	const base = buildResource(schema, { type, id: id ?? crypto.randomUUID() });
	const normalRes = mergeResources(base, resource);

	setInverseRelationships(base, normalRes, context);

	storeGraph[normalRes.type][normalRes.id] = normalRes;
	return normalRes;
}
