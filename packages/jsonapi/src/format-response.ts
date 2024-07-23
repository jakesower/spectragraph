import { applyOrMap } from "@data-prism/utils";
import {
	createGraphFromTrees,
	normalizeQuery,
	normalizeResource,
} from "data-prism";
import { mapValues, omit } from "lodash-es";

export function formatResponse(schema, query, result) {
	const dataIds = new Set();
	const data = applyOrMap(result, (res) => {
		const resSchema = schema.resources[query.type];
		const normalized = normalizeResource(query.type, res, schema);
		dataIds.add(res[resSchema.idField ?? "id"]);

		return {
			type: query.type,
			id: res[resSchema.idField ?? "id"],
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
