import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import { NormalResource, Ref } from "./graph";

// WARNING: MUTATES storeGraph
export function create(resource, context) {
	const { schema, storeGraph } = context;
	const { id, type } = resource;

	const resSchema = schema.resources[resource.type];
	const normalRes: NormalResource = {
		attributes: resource.attributes ?? {},
		relationships: mapValues(
			resSchema.relationships,
			(rel, relName) =>
				resource.relationships?.[relName] ??
				(rel.cardinality === "one" ? null : []),
		),
		id: id ?? uuidv4(),
		type,
	};

	Object.entries(normalRes.relationships).forEach(([relName, related]) => {
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
						id: normalRes.id,
					};
				});
			} else {
				refs.forEach((ref) => {
					(
						(storeGraph[relType][ref.id].relationships[inverse] as Ref[]) ?? []
					).push({
						type: resource.type,
						id: normalRes.id,
					});
				});
			}
		}
	});

	storeGraph[normalRes.type][normalRes.id] = normalRes;

	return normalRes;
}
