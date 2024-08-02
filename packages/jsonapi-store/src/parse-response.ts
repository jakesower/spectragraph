import { Schema, queryGraph } from "data-prism";
import { mapValues } from "lodash-es";

export function parseResponse(schema: Schema, query, response) {
	if (response.data === null) return null;

	const graph = mapValues(schema.resources, () => ({}));
	const dataArray = Array.isArray(response.data)
		? response.data
		: [response.data];

	const extractResource = (datum) => {
		const resSchema = schema.resources[datum.type];

		graph[datum.type][datum.id] = {
			...datum,
			attributes: {
				[resSchema.idField ?? "id"]: datum.id,
				...datum.attributes,
			},
			relationships: mapValues(datum.relationships ?? {}, (r) => r.data),
		};
	};

	dataArray.forEach(extractResource);
	(response.included ?? []).forEach(extractResource);

	return queryGraph(graph, query);
}
