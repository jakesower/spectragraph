// WARNING: MUTATES storeGraph
/**
 * @param {import('./graph.js').NormalResource} resource
 * @param {Object} context
 * @param {import('./schema.js').Schema} context.schema
 * @param {import('./graph.js').Graph} context.storeGraph
 * @returns {import('./graph.js').NormalResource}
 */
export function createOrUpdate(resource, context) {
	const { schema, storeGraph } = context;
	const { type } = resource;

	const resSchema = schema.resources[resource.type];

	Object.entries(resource.relationships).forEach(([relName, related]) => {
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
					/** @type {import('./graph.js').Ref | null} */
					const currentInverseRef = storeGraph[relType][ref.id].relationships[
						inverse
					];

					if (currentInverseRef && currentInverseRef.id !== ref.id) {
						if (relSchema.cardinality === "one") {
							storeGraph[type][currentInverseRef.id].relationships[relName] =
								null;
						} else {
							storeGraph[type][currentInverseRef.id].relationships[relName] = (
								/** @type {import('./graph.js').Ref[]} */ (storeGraph[type][currentInverseRef.id].relationships[
									relName
								])
							).filter((r) => r.id !== storeGraph[relType][ref.id].id);
						}
					}

					storeGraph[relType][ref.id].relationships[inverse] = {
						type: resource.type,
						id: resource.id,
					};
				});
			} else {
				refs.forEach((ref) => {
					const isRedundantRef = (
						/** @type {import('./graph.js').Ref[]} */ (storeGraph[ref.type][ref.id].relationships[inverse]) ?? []
					).some((r) => r.id === resource.id);

					if (!isRedundantRef) {
						(
							/** @type {import('./graph.js').Ref[]} */ (storeGraph[ref.type][ref.id].relationships[inverse]) ??
							[]
						).push({
							type: resource.type,
							id: resource.id,
						});
					}
				});
			}
		}
	});

	storeGraph[resource.type][resource.id] = resource;

	return resource;
}