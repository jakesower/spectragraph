import { normalizeQuery, queryGraph } from '@data-prism/core';
import { uniq, mapValues } from 'lodash-es';

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
	const type = query.type;
	const attributes = [];
	
	// Get attributes from select
	if (Array.isArray(query.select)) {
		query.select.forEach(item => {
			if (typeof item === 'string') {
				attributes.push(item);
			} else if (typeof item === 'object') {
				Object.entries(item).forEach(([key, subquery]) => {
					// Recursively handle relationships
					if (typeof subquery === 'object' && subquery.select) {
						forEachQuery(schema, {...subquery, type: schema.resources[type].relationships[key].type}, callback, [...path, key], query);
					}
				});
			}
		});
	} else if (typeof query.select === 'object') {
		Object.entries(query.select).forEach(([key, value]) => {
			if (typeof value === 'string') {
				attributes.push(value); // Use the schema field name, not the alias
			} else if (typeof value === 'object' && value.select) {
				// Handle relationship
				forEachQuery(schema, {...value, type: schema.resources[type].relationships[key].type}, callback, [...path, key], query);
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
function formatRequest(schema, config, query) {
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

/**
 * Parses a JSON:API response into Data Prism query results
 * @param {import("@data-prism/core").Schema} schema - Data Prism schema
 * @param {import("@data-prism/core").RootQuery} query - Original query
 * @param {Object} response - JSON:API response object
 * @returns {*} Query results in Data Prism format
 */
function parseResponse(schema, query, response) {
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

/**
 * Creates a JSON:API store that proxies requests to a remote JSON:API server
 * @param {import("@data-prism/core").Schema} schema - Data Prism schema
 * @param {Object} config - Store configuration
 * @param {Object} config.transport - HTTP transport implementation
 * @param {string} config.baseURL - Base URL for the JSON:API server
 * @returns {import("@data-prism/core").Store} Store instance implementing the core Store interface
 */
function createJSONAPIStore(schema, config) {
	const { transport } = config;

	const makeRequest = (req) => {
		try {
			return transport.get(req);
		} catch (err) {
			throw new Error({ ...err, transportError: true });
		}
	};

	return {
		async query(query) {
			try {
				const req = formatRequest(schema, config, query);
				const res = await makeRequest(req);

				return parseResponse(schema, query, res);
			} catch (err) {
				if (err.transportError && err.response?.statusCode === 404) {
					return null;
				}

				throw err;
			}
		},
		
		async create(_resource) {
			throw new Error("create method not implemented for JSON:API store");
		},
		
		async update(_resource) {
			throw new Error("update method not implemented for JSON:API store");
		},
		
		async delete(_resource) {
			throw new Error("delete method not implemented for JSON:API store");
		},
		
		async upsert(_resource) {
			throw new Error("upsert method not implemented for JSON:API store");
		},
	};
}

export { createJSONAPIStore, formatRequest, parseResponse };
