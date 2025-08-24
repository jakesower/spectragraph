import { normalizeQuery } from "@data-prism/core";
import { uniq } from "lodash-es";

const objectToParamStr = (obj, rootKey) => {
	const go = (cur) =>
		Object.entries(cur).flatMap(([k, v]) =>
			Array.isArray(v)
				? `[${k}]=[${v.join(",")}]`
				: typeof v === "object"
					? `[${k}]${go(v)}`
					: `[${k}]=${v}`,
		);

	return go(obj)
		.map((x) => `${rootKey}${x}`)
		.join("&");
};

// Simple implementation to replace the missing forEachQuery function
const forEachQuery = (schema, query, callback, path = [], parent = null) => {
	const { type } = query;
	const attributes = [];

	// Get attributes from select
	if (Array.isArray(query.select)) {
		query.select.forEach((item) => {
			if (typeof item === "string") {
				attributes.push(item);
			} else if (typeof item === "object") {
				Object.entries(item).forEach(([key, subquery]) => {
					// Recursively handle relationships
					if (typeof subquery === "object" && subquery.select) {
						forEachQuery(
							schema,
							{
								...subquery,
								type: schema.resources[type].relationships[key].type,
							},
							callback,
							[...path, key],
							query,
						);
					}
				});
			}
		});
	} else if (typeof query.select === "object") {
		Object.entries(query.select).forEach(([key, value]) => {
			if (typeof value === "string") {
				attributes.push(value); // Use the schema field name, not the alias
			} else if (typeof value === "object" && value.select) {
				// Handle relationship
				forEachQuery(
					schema,
					{ ...value, type: schema.resources[type].relationships[key].type },
					callback,
					[...path, key],
					query,
				);
			}
		});
	}

	callback(query, { type, attributes, path, parent });
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
			Object.entries(subquery.where).forEach(([field, filter]) => {
				const k = [...info.path, field].join(".");
				filters[k] = filter;
			});
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
