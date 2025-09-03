'use strict';

var core = require('@data-prism/core');
var esToolkit = require('es-toolkit');

/**
 * @typedef {Object} QueryBreakdownItem
 * @property {string[]} path - Path to this query level
 * @property {any} attributes - Selected attributes
 * @property {any} relationships - Selected relationships
 * @property {string} type - Resource type
 * @property {import('@data-prism/core').Query} query - The query object
 * @property {QueryBreakdownItem|null} parent - Parent breakdown item if any
 * @property {import('@data-prism/core').Query|null} parentQuery - Parent query if any
 * @property {string|null} parentRelationship - Parent relationship name if any
 */

/**
 * @typedef {QueryBreakdownItem[]} QueryBreakdown
 */

/**
 * Flattens a nested query into a linear array of query breakdown items
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} rootQuery - The root query to flatten
 * @returns {QueryBreakdown} Flattened query breakdown
 */
function flattenQuery(schema, rootQuery) {
	const go = (query, type, path, parent = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const { idAttribute = "id" } = resDef;
		const [attributesEntries, relationshipsEntries] = esToolkit.partition(
			Object.entries(query.select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" &&
				(propVal in resDef.attributes || propVal === idAttribute),
		);

		const attributes = attributesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			attributes,
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			query,
			relationships: esToolkit.pick(query.select, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.select[relKey];

				return go(subquery, relDef.type, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}

/**
 * Iterates over each query in a flattened query structure
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => void} fn - Iteration function
 */
function forEachQuery(schema, query, fn) {
	return flattenQuery(schema, query).forEach((info) => fn(info.query, info));
}

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

/**
 * Formats a Data Prism query into a JSON:API request URL
 * @param {import("@data-prism/core").Schema} schema - Data Prism schema
 * @param {Object} config - Store configuration with baseURL
 * @param {import("@data-prism/core").RootQuery} query - Query to format
 * @returns {string} Complete request URL with query parameters
 */
function formatRequest(schema, config, query) {
	const normalizedQuery = core.normalizeQuery(schema, query);
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
		.map(([type, vals]) => `fields[${type}]=${esToolkit.uniq(vals).join(",")}`)
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

	const graph = esToolkit.mapValues(schema.resources, () => ({}));
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
			relationships: esToolkit.mapValues(datum.relationships ?? {}, (r) => r.data),
		};
	};

	dataArray.forEach(extractResource);
	(response.included ?? []).forEach(extractResource);

	return core.queryGraph(schema, query, graph);
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

		async create() {
			throw new Error("create method not implemented for JSON:API store");
		},

		async update() {
			throw new Error("update method not implemented for JSON:API store");
		},

		async delete() {
			throw new Error("delete method not implemented for JSON:API store");
		},

		async upsert() {
			throw new Error("upsert method not implemented for JSON:API store");
		},
	};
}

exports.createJSONAPIStore = createJSONAPIStore;
exports.formatRequest = formatRequest;
exports.parseResponse = parseResponse;
