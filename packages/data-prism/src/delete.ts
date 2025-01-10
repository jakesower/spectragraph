import { NormalResource, Ref } from "./graph";

export type DeleteResource = {
	type: string;
	id: string;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] };
};

// WARNING: MUTATES storeGraph
export function deleteAction(resource: DeleteResource, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;
	const resSchema = schema.resources[resource.type];
	const existingRes: NormalResource = storeGraph[type][id];

	Object.entries(existingRes.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			const refs: Ref[] =
				related === null ? [] : Array.isArray(related) ? related : [related];

			if (inverseRel.cardinality === "one") {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = null;
				});
			} else {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = (
						(storeGraph[relType][ref.id].relationships[inverse] as Ref[]) ?? []
					).filter((r) => r.id !== resource.id);
				});
			}
		}
	});

	delete storeGraph[type][id];

	return resource;
}
