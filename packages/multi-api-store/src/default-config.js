import { mapValues, pickBy } from "es-toolkit";

/**
 * @typedef {Object} CacheConfig
 * @property {(query: Object, options?: Object) => string[]} [dependsOnTypes] - Function to determine which resource types the query depends on for caching
 * @property {boolean} [enabled] - Whether caching is enabled
 * @property {(query: Object, context?: Object) => string} [generateKey] - Custom cache key generator
 * @property {boolean} [manual] - Whether to bypass caching
 * @property {number} [ttl] - Default TTL for the cache in milliseconds
 */

/**
 * @typedef {Object} RequestConfig
 * @property {string} [baseURL] - Base URL for standard HTTP handlers
 * @property {Object} [headers] - HTTP headers to be sent with the request
 * @property {Object[]} [queryParams] - Initial query params
 * @property {string} [queryParamsStr] - The query string (typically constructed with stringifyQueryParams)
 */

/**
 * @typedef {Config} SpecialHandler
 * @property {(query: Object, context: Object) => boolean} test - Test applied to context to see if the special handler applies
 * @property {(context: import('./load-query-graph.js').MiddlewareContext) => (Response|Object|Promise<Response>|Promise<Object>)} handler - Handler function to execute when test passes
 */

/**
 * @typedef {Object} ResourceOperationConfig
 * @property {Function} [fetch] - Function that actually fetches the resource data. Signature varies by operation type.
 * @property {(apiResource: Object, context?: Object) => Object} [map] - A mapping function applied to each resource after fetching
 * @property {Object<string, Function|string>} [mappers] - An object defining mappings for each resource attribute and relationship. Ignored if map is present.
 */

/**
 * @typedef {Object} Config
 * @property {CacheConfig} [cache] - Config for the cache
 * @property {Array<(context: import('./load-query-graph.js').MiddlewareContext, next: Function) => any>} [middleware] - Middleware functions to apply to all requests
 * @property {RequestConfig} [request] - Default request configuration
 * @property {Array<SpecialHandler>} [specialHandlers] - Special handlers that override resource handlers based on conditions
 * @property {(paramArray: Object<string, any>[]) => string} [stringifyQueryParams] - Query parameter serialization function
 * @property {Function|ResourceOperationConfig} [query] - Fetch and map definitions for query operations - if a function is given it's resolved to { fetch: fn }
 * @property {Function|ResourceOperationConfig} [create] - Fetch and map definitions for create operations - if a function is given it's resolved to { fetch: fn }
 * @property {Function|ResourceOperationConfig} [update] - Fetch and map definitions for update operations - if a function is given it's resolved to { fetch: fn }
 * @property {Function|ResourceOperationConfig} [delete] - Fetch and map definitions for delete operations - if a function is given it's resolved to { fetch: fn }
 */

/**
 * @typedef {Object} NormalConfig
 * @property {CacheConfig} [cache] - Config for the cache
 * @property {Array<(context: import('./load-query-graph.js').MiddlewareContext, next: Function) => any>} [middleware] - Middleware functions to apply to all requests
 * @property {RequestConfig} [request] - Default request configuration
 * @property {Array<SpecialHandler>} [specialHandlers] - Special handlers that override resource handlers based on conditions
 * @property {(paramArray: Object<string, any>[]) => string} [stringifyQueryParams] - Query parameter serialization function
 * @property {ResourceOperationConfig} [query] - Fetch and map definitions for query operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} [create] - Fetch and map definitions for create operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} [update] - Fetch and map definitions for update operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} [delete] - Fetch and map definitions for delete operations - if a function is given it's resolved to { fetch: fn }
 */

/**
 * @typedef {Object} FullConfig
 * @property {CacheConfig} cache - Config for the cache
 * @property {Array<(context: import('./load-query-graph.js').MiddlewareContext, next: Function) => any>} middleware - Middleware functions to apply to all requests
 * @property {RequestConfig} request - Default request configuration
 * @property {Array<SpecialHandler>} specialHandlers - Special handlers that override resource handlers based on conditions
 * @property {(paramArray: Object<string, any>[]) => string} stringifyQueryParams - Query parameter serialization function
 * @property {ResourceOperationConfig} query - Fetch and map definitions for query operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} create - Fetch and map definitions for create operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} update - Fetch and map definitions for update operations - if a function is given it's resolved to { fetch: fn }
 * @property {ResourceOperationConfig} delete - Fetch and map definitions for delete operations - if a function is given it's resolved to { fetch: fn }
 */

/**
 * @typedef {Config} StoreConfig
 * @property {Object<string, Config>} [resources] - Resource-specific handler configurations
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
			? `${request.baseURL}/${query.type}/${query.id}${request.queryParamsStr}`
			: `${request.baseURL}/${query.type}${request.queryParamsStr}`;

		return fetch(url);
	},

	create: async (resource, { config }) => {
		const url = `${config.request.baseURL}/${resource.type}`;

		return fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	update: async (resource, { config }) => {
		const url = `${config.request.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	delete: async (resource, { config }) => {
		const url = `${config.request.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "DELETE",
		});
	},
};

/**
 * Default configuration for multi-api-store with relationship-aware cache invalidation.
 * Provides sensible defaults for caching, handlers, and request configuration.
 *
 * @type {Partial<Config>}}
 */
export const defaultConfig = {
	cache: {
		enabled: true,
		manual: false,
		ttl: 5 * 60 * 1000, // 5 minutes default
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
	...mapValues(standardHandlers, (h) => ({
		fetch: h,
		map: (x) => x,
	})),
	pushdown: {},
	request: {
		baseURL: "",
		headers: { Accept: "application/json" },
		queryParams: {},
	},
	stringifyQueryParams: (queryParams) => {
		const qpObj = pickBy(queryParams ?? {}, (v) => v != null);
		const qpString = new URLSearchParams(qpObj).toString();

		return qpString === "" ? "" : `?${qpString}`;
	},
};
