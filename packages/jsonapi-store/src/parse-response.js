import { queryGraph } from "@spectragraph/core";
import { mapValues } from "es-toolkit";

/**
 * Parses a JSON:API response into SpectraGraph query results
 * @param {import("@spectragraph/core").Schema} schema - SpectraGraph schema
 * @param {import("@spectragraph/core").RootQuery} query - Original query
 * @param {Object} response - JSON:API response object
 * @returns {*} Query results in SpectraGraph format
 */
export function parseResponse(schema, query, response) {
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
				[resSchema.idAttribute ?? "id"]: datum.id,
				...datum.attributes,
			},
			relationships: mapValues(datum.relationships ?? {}, (r) => r.data),
		};
	};

	dataArray.forEach(extractResource);
	(response.included ?? []).forEach(extractResource);

	return queryGraph(schema, query, graph);
}
