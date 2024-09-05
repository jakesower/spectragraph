import { NormalResource, Ref } from "./graph";

// WARNING: MUTATES storeGraph
export function createOrUpdate(resource: NormalResource, context) {
	const { schema, storeGraph } = context;
	const { type } = resource;

	const resSchema = schema.resources[resource.type];

	Object.entries(resource.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			const refs: Ref[] =
				related === null ? [] : Array.isArray(related) ? related : [related];

			if (inverseRel.cardinality === "one") {
				refs.forEach((ref) => {
					const currentInverseRef = storeGraph[relType][ref.id].relationships[
						inverse
					] as Ref | null;

					if (currentInverseRef && currentInverseRef.id !== ref.id) {
						if (relSchema.cardinality === "one") {
							storeGraph[type][currentInverseRef.id].relationships[relName] =
								null;
						} else {
							storeGraph[type][currentInverseRef.id].relationships[relName] = (
								storeGraph[type][currentInverseRef.id].relationships[
									relName
								] as Ref[]
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
						(storeGraph[relType][ref.id].relationships[inverse] as Ref[]) ?? []
					).some((r) => r.id === resource.id);
					if (!isRedundantRef) {
						(
							(storeGraph[relType][ref.id].relationships[inverse] as Ref[]) ??
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
