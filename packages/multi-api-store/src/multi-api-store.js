import {
	ensureValidSchema,
	normalizeQuery,
	queryGraph,
	StoreOperationNotSupportedError,
	ensureValidCreateResource,
	ensureValidUpdateResource,
	ensureValidDeleteResource,
	defaultValidator,
	defaultSelectEngine,
	defaultWhereEngine,
} from "@spectragraph/core";
import { mapValues } from "es-toolkit";
import { loadQueryGraph } from "./load-query-graph.js";
import { createCache } from "./cache.js";
import { standardHandlers, defaultConfig } from "./default-config.js";
import {
	compileResourceMappers,
	handleResponseData,
} from "./helpers/helpers.js";

/**
 * Creates a multi-API store that can delegate operations to different API handlers.
 * Supports custom handlers, caching, middleware, and relationship-aware cache invalidation.
 *
 * @param {import('@spectragraph/core').Schema} schema - The schema defining resource types and relationships
 * @param {Object} [config={}] - Configuration object
 * @param {Object} [config.cache] - Cache configuration options
 * @param {boolean} [config.cache.enabled=true] - Whether caching is enabled
 * @param {number} [config.cache.defaultTTL] - Default time-to-live for cache entries in milliseconds
 * @param {Function} [config.cache.dependsOnTypes] - Function to determine which resource types a query depends on
 * @param {Object} [config.resources] - Resource-specific handler configurations
 * @param {Object} [config.resources.*.handlers] - Handler definitions for each operation (get, create, update, delete)
 * @param {Object} [config.resources.*.handlers.*.fetch] - The fetch function for the operation
 * @param {Object|Function} [config.resources.*.handlers.*.map] - Response mapping function or mappers config
 * @param {Array} [config.middleware] - Middleware functions to apply to all requests
 * @param {Array} [config.specialHandlers] - Special handlers that override resource handlers based on conditions
 * @param {string} [config.baseURL] - Base URL for standard HTTP handlers
 * @param {Object} [config.request] - Default request configuration
 * @returns {import('@spectragraph/core').Store} Store instance with query, create, update, delete, and upsert methods
 */
export function createMultiApiStore(schema, config = {}) {
	ensureValidSchema(schema);

	// normalize config
	const normalConfig = {
		middleware: [],
		specialHandlers: [],
		...config,
		request: {
			...defaultConfig.request,
			...config.request,
			...(config.baseURL && { baseURL: config.baseURL }),
		},
		cache: {
			...defaultConfig.cache,
			...config.cache,
		},
		resources: mapValues(config.resources ?? {}, (resConfig, type) => {
			const handlers = mapValues(resConfig.handlers ?? {}, (h) => ({
				fetch: h.fetch,
				map:
					h.map ??
					(h.mappers
						? compileResourceMappers(schema, type, h.mappers)
						: (res) => res),
			}));

			return {
				...resConfig,
				handlers,
			};
		}),
	};

	const {
		validator = defaultValidator,
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
		specialHandlers = [],
	} = normalConfig;

	const cache = createCache(normalConfig);

	const storeContext = {
		schema,
		config: normalConfig,
		resources: normalConfig.resources,
		middleware: normalConfig.middleware ?? [],
		specialHandlers: specialHandlers ?? [],
		withCache: cache.withCache,
		cache,
	};

	const runQuery = async (rootQuery, queryContext = {}) => {
		const normalQuery = normalizeQuery(schema, rootQuery, {
			selectEngine,
			whereEngine,
		});
		const graph = await loadQueryGraph(normalQuery, {
			...storeContext,
			...queryContext,
		});

		return queryGraph(schema, rootQuery, graph, { selectEngine, whereEngine });
	};

	const create = async (resource) => {
		const { type } = resource;

		ensureValidCreateResource(schema, resource, validator);

		const createHandler =
			normalConfig.resources[type]?.handlers?.create?.fetch ??
			standardHandlers.create;

		// Clear cache for this resource type when creating
		cache.clearByType(type, normalConfig, { schema });

		const result = await createHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleResponseData(result);
	};

	const update = async (resource) => {
		const { type } = resource;

		ensureValidUpdateResource(schema, resource, validator);

		const updateHandler =
			normalConfig.resources[type]?.handlers?.update?.fetch ??
			standardHandlers.update;

		// Clear cache for this resource type when updating
		cache.clearByType(type, normalConfig, { schema });

		const result = await updateHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleResponseData(result);
	};

	const deleteResource = async (resource) => {
		const { type } = resource;

		ensureValidDeleteResource(schema, resource, validator);

		const deleteHandler =
			normalConfig.resources[type]?.handlers?.delete?.fetch ??
			standardHandlers.delete;

		// Clear cache for this resource type when deleting
		cache.clearByType(type, normalConfig, { schema });

		const result = await deleteHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleResponseData(result, resource);
	};

	return {
		query: runQuery,
		create,
		update,
		async upsert(resource) {
			return resource.id ? this.update(resource) : this.create(resource);
		},
		delete: deleteResource,
		merge: () => {
			throw new StoreOperationNotSupportedError("merge", "multi-api-store");
		},
	};
}
