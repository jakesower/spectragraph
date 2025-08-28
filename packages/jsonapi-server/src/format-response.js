import { applyOrMap } from "@data-prism/utils";
import {
	createGraphFromResources,
	normalizeQuery,
	normalizeResource,
} from "@data-prism/core";
import { mapValues, omit } from "es-toolkit";

/**
 * Formats query results into JSON:API response format
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {import("@data-prism/core").RootQuery} query - The query that was executed
 * @param {*} result - The query results to format
 * @returns {Object} JSON:API formatted response object
 */
export function formatResponse(schema, query, result) {
	if (result === null) return { data: null };

	const dataIds = new Set();
	const data = applyOrMap(result, (res) => {
		const resSchema = schema.resources[query.type];
		const normalized = normalizeResource(schema, query.type, res);
		dataIds.add(res[resSchema.idAttribute ?? "id"]);

		return {
			type: query.type,
			id: res[resSchema.idAttribute ?? "id"],
			attributes: omit(normalized.attributes, [resSchema.idAttribute ?? "id"]),
			relationships: mapValues(normalized.relationships, (rel) => ({
				data: rel,
			})),
		};
	});

	const normalizedQuery = normalizeQuery(schema, query);
	const hasIncluded = Object.values(normalizedQuery.select).some(
		(s) => typeof s === "object",
	);

	if (!hasIncluded) {
		return { data };
	}

	const graph = createGraphFromResources(
		schema,
		query.type,
		Array.isArray(result) ? result : [result],
	);

	const included = [];
	Object.entries(graph).forEach(([type, ress]) => {
		const relDef = schema.resources[type];

		Object.entries(ress).forEach(([id, res]) => {
			if (type === query.type && dataIds.has(id)) return;

			included.push({
				type,
				id,
				attributes: omit(res.attributes, relDef.idAttribute ?? "id"),
				relationships: mapValues(res.relationships, (rel) => ({ data: rel })),
			});
		});
	});

	return { data, ...(included.length === 0 ? {} : { included }) };
}
