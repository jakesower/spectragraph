import { mapValues } from "es-toolkit";

/**
 * @typedef {Object} CacheConfig
 * @property {boolean} [enabled] - Whether caching is enabled
 * @property {Function} [generateKey] - Custom cache key generator
 * @property {boolean} [manual] - Whether to bypass caching
 */

/**
 * @typedef {Object} HandlerConfig
 * @property {Function} [fetch] - Fetch function
 * @property {Function} [map] - Response mapping function
 */

/**
 * @typedef {Object} HandlersConfig
 * @property {HandlerConfig} [query] - QUERY operation handler
 * @property {HandlerConfig} [create] - CREATE operation handler
 * @property {HandlerConfig} [update] - UPDATE operation handler
 * @property {HandlerConfig} [delete] - DELETE operation handler
 */

/**
 * @typedef {Object} RequestConfig
 * @property {string} [baseURL] - Base URL for requests
 * @property {Object} [headers] - Default headers
 * @property {Array<Object>} [queryParams] - Default query parameters
 */

/**
 * @typedef {Object} StoreConfig
 * @property {CacheConfig} [cache] - Cache configuration
 * @property {HandlersConfig} [handlers] - Request handlers for different operations
 * @property {RequestConfig} [request] - Default request configuration
 * @property {Function} [stringifyQueryParams] - Query parameter serialization function
 */

/**
 * Standard HTTP handlers for RESTful API operations.
 * These handlers implement common patterns for GET, POST, PATCH, and DELETE operations.
 *
 * @type {Object}
 * @property {Function} query - QUERY handler for fetching resources
 * @property {Function} create - POST handler for creating resources
 * @property {Function} update - PATCH handler for updating resources
 * @property {Function} delete - DELETE handler for removing resources
 */
export const standardHandlers = {
	query: async (context) => {
		const { request, query } = context;

		const url = query.id
			? `${request.baseURL}/${query.type}/${query.id}`
			: `${request.baseURL}/${query.type}`;

		return fetch(url);
	},

	create: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}`;

		return fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	update: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	delete: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "DELETE",
		});
	},
};

/**
 * Default configuration for multi-api-store with relationship-aware cache invalidation.
 * Provides sensible defaults for caching, handlers, and request configuration.
 *
 * @type {StoreConfig}
 */
export const defaultConfig = {
	cache: {
		enabled: true,
		manual: false,
		defaultTTL: 5 * 60 * 1000, // 5 minutes default
		generateKey: (query) => `${query.type}-${query.id ?? ""}`,
		dependsOnTypes: (query, options = {}) => {
			const { schema } = options;
			if (!schema) return [query.type];

			const resourceType = query.type;
			const resourceSchema = schema.resources?.[resourceType];
			const relatedTypes = Object.values(
				resourceSchema?.relationships ?? {},
			).map((rel) => rel.type);

			return [resourceType, ...relatedTypes];
		},
	},
	handlers: mapValues(standardHandlers, (h) => ({
		fetch: h,
		map: (x) => x,
	})),
	request: {
		baseURL: "",
		headers: {},
		queryParams: [],
	},
	stringifyQueryParams: (queryParams) => {
		const qpStrings = (queryParams ?? []).flatMap((qpObj) =>
			Object.entries(qpObj)
				.filter(([, v]) => v != null)
				.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`),
		);

		return qpStrings.length === 0 ? "" : `?${qpStrings.join("&")}`;
	},
};
