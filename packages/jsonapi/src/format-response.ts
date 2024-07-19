import { applyOrMap } from "@data-prism/utils";
import {
	createGraphFromTrees,
	normalizeQuery,
	normalizeResource,
} from "data-prism";
import { mapValues, omit } from "lodash-es";

export function formatResponse(schema, query, result) {
	const data = applyOrMap(result, (res) => {
		const resSchema = schema.resources[query.type];
		const normalized = normalizeResource(query.type, res, schema);

		return {
			type: query.type,
			id: res.id,
			attributes: omit(normalized.attributes, [resSchema.idField ?? "id"]),
			relationships: mapValues(normalized.relationships, (rel) => ({
				data: rel,
			})),
		};
	});

	const normalizedQuery = normalizeQuery(query);
	const hasIncluded = Object.values(normalizedQuery.select).some(
		(s) => typeof s === "object",
	);

	if (!hasIncluded) {
		return { data };
	}

	const graph = createGraphFromTrees(
		query.type,
		Array.isArray(result) ? result : [result],
		schema,
	);

	const dataIds = new Set(
		Array.isArray(data) ? data.map((d) => d.id) : data.id,
	);

	const included = [];
	Object.entries(graph).map(([type, ress]) => {
		const relDef = schema.resources[type];

		Object.entries(ress).forEach(([id, res]) => {
			if (type === query.type && dataIds.has(id)) return;

			included.push({
				type,
				id,
				attributes: omit(res.attributes, relDef.idField ?? "id"),
				relationships: mapValues(res.relationships, (rel) => ({ data: rel })),
			});
		});
	});

	return { data, ...(included.length === 0 ? {} : { included }) };
}
