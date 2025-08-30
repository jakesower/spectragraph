import { mapValues } from "es-toolkit";
import { setInversesOnRelationship } from "./lib/store-helpers.js";

/**
 * Deletes a resource from the store and cleans up all inverse relationships.
 * Ensures referential integrity by removing references to the deleted resource
 * from all related resources.
 *
 * WARNING: MUTATES storeGraph
 *
 * @param {import('@data-prism/core').DeleteResource} resource - The resource to delete
 * @param {import('./memory-store.js').MemoryStoreContext} context - Context object containing schema and storeGraph
 * @returns {import('@data-prism/core').DeleteResource} The deleted resource
 */
export function deleteAction(resource, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;

	const resSchema = schema.resources[type];
	const existingRes = storeGraph[type][id];

	// Clean up inverse relationships before deleting
	mapValues(resSchema.relationships, (relSchema, relName) => {
		setInversesOnRelationship(
			existingRes,
			relSchema.cardinality === "one" ? null : [],
			relName,
			context,
		);
	});

	// Remove the resource from the store
	delete storeGraph[type][id];

	return resource;
}
