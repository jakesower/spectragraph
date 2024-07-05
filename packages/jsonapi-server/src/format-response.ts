import { applyOrMap } from "@data-prism/utils";
import { normalizeResource } from "data-prism";

export function formatResponse(schema, query, result) {
	const formatted = applyOrMap(result, (res) => ({
		type: query.type,
		id: res.id,
		...normalizeResource(query.type, res, schema),
	}));

	return { data: formatted };
}
