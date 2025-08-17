import { updateAllInverseRelationships } from "./lib/store-helpers.js";

/**
 * Creates or updates a resource in the store and maintains inverse relationships.
 * Updates related resources to ensure bidirectional relationship consistency.
 * Handles both one-to-one and one-to-many relationship cardinalities.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').NormalResource} resource - The normalized resource to create or update
 * @param {import('./memory-store.js').MemoryStoreContext} context - Context object containing schema and storeGraph
 * @returns {import('@data-prism/core').NormalResource} The created or updated resource
 */
export function createOrUpdate(resource, context) {
	const { storeGraph } = context;

	// Store the resource first
	storeGraph[resource.type][resource.id] = resource;

	// Update all inverse relationships
	updateAllInverseRelationships(resource, context);

	return resource;
}
