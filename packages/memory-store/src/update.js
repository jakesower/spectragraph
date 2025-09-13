import { setInverseRelationships } from "./lib/store-helpers.js";

/**
 * Updates an existing resource in the store and maintains all inverse relationships.
 * Merges provided attributes and relationships with existing resource data.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@spectragraph/core').UpdateResource} resource - The resource to update
 * @param {import('./memory-store.js').MemoryStoreContext} context - Context object containing schema and storeGraph
 * @returns {import('@spectragraph/core').NormalResource} The updated resource
 */
export function update(resource, context) {
	const { storeGraph } = context;

	const existingRes = storeGraph[resource.type][resource.id];
	const normalRes = {
		...resource,
		attributes: { ...existingRes.attributes, ...resource.attributes },
		relationships: {
			...existingRes.relationships,
			...resource.relationships,
		},
	};

	setInverseRelationships(existingRes, normalRes, context);

	storeGraph[resource.type][resource.id] = normalRes;
	return normalRes;
}
