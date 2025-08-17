
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
	const resSchema = schema.resources[resource.type];
	/** @type {import('@data-prism/core').NormalResource} */
	const existingRes = storeGraph[type][id];

	Object.entries(existingRes.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			/** @type {import('@data-prism/core').Ref[]} */
			const refs =
				related === null ? [] : Array.isArray(related) ? related : [related];

			if (inverseRel.cardinality === "one") {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = null;
				});
			} else {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = (
						storeGraph[relType][ref.id].relationships[inverse] ?? []
					).filter((r) => r.id !== resource.id);
				});
			}
		}
	});

	delete storeGraph[type][id];

	return resource;
}
