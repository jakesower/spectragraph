/**
 * @typedef {Object} DeleteResource
 * @property {string} type
 * @property {string} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, import('./graph.js').Ref | import('./graph.js').Ref[]>} [relationships]
 */

// WARNING: MUTATES storeGraph
/**
 * @param {DeleteResource} resource
 * @param {Object} context
 * @param {import('./schema.js').Schema} context.schema
 * @param {import('./graph.js').Graph} context.storeGraph
 * @returns {DeleteResource}
 */
export function deleteAction(resource, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;
	const resSchema = schema.resources[resource.type];
	/** @type {import('./graph.js').NormalResource} */
	const existingRes = storeGraph[type][id];

	Object.entries(existingRes.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			/** @type {import('./graph.js').Ref[]} */
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
