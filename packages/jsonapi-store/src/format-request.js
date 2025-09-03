import { normalizeQuery } from "@data-prism/core";
import { forEachQuery } from "@data-prism/query-helpers";
import { uniq } from "es-toolkit";
import { processFilter } from "./lib/where-expressions.js";

const objectToParamStr = (obj, rootKey) => {
	const go = (cur) =>
		Object.entries(cur).flatMap(([k, v]) =>
			Array.isArray(v)
				? `[${k}]=[${v.join(",")}]`
				: typeof v === "object" && v !== null
					? `[${k}]${go(v)}`
					: `[${k}]=${encodeURIComponent(v)}`,
		);

	return go(obj)
		.map((x) => `${rootKey}${x}`)
		.join("&");
};

/**
 * Formats a Data Prism query into a JSON:API request URL
 * @param {import("@data-prism/core").Schema} schema - Data Prism schema
 * @param {Object} config - Store configuration with baseURL
 * @param {import("@data-prism/core").RootQuery} query - Query to format
 * @returns {string} Complete request URL with query parameters
 */
export function formatRequest(schema, config, query) {
	const normalizedQuery = normalizeQuery(schema, query);
	const fields = {};
	const include = [];
	const filters = {};

	// fields and where/filter
	forEachQuery(schema, normalizedQuery, (subquery, info) => {
		if (info.parent) {
			include.push(info.path.join("."));
		}

		fields[info.type] = [...(fields[info.type] ?? []), ...info.attributes];

		if (subquery.where) {
			// Process the entire where clause as a single expression
			const processedWhere = processFilter(subquery.where);

			// If the processed where is an object, merge its properties with path prefix
			if (
				typeof processedWhere === "object" &&
				processedWhere !== null &&
				!Array.isArray(processedWhere)
			) {
				Object.entries(processedWhere).forEach(([field, value]) => {
					const k =
						info.path.length > 0 ? `${info.path.join(".")}.${field}` : field;
					filters[k] = value;
				});
			} else {
				// Fallback to old behavior
				Object.entries(subquery.where).forEach(([field, filter]) => {
					const k = [...info.path, field].join(".");
					filters[k] = filter;
				});
			}
		}
	});

	const fieldsStr = Object.entries(fields)
		.map(([type, vals]) => `fields[${type}]=${uniq(vals).join(",")}`)
		.join("&");

	const includeStr = include.length > 0 && `include=${include.join(",")}`;

	const sortStr =
		query.order &&
		`sort=${normalizedQuery.order
			.map((q) =>
				Object.entries(q).map(([attr, dir]) =>
					dir === "asc" ? attr : `-${attr}`,
				),
			)
			.join(",")}`;

	const { limit, offset = 0 } = query;
	const pageStr =
		limit &&
		objectToParamStr(
			{
				number: Math.floor(offset / limit) + 1,
				size: limit + (offset % limit),
			},
			"page",
		);

	const filterStr =
		Object.keys(filters).length > 0 && objectToParamStr(filters, "filter");

	const paramStr = [fieldsStr, includeStr, sortStr, pageStr, filterStr]
		.filter(Boolean)
		.join("&");
	const path = `${query.type}${query.id ? `/${query.id}` : ""}`;

	return `${config.baseURL}/${path}?${paramStr}`;
}
