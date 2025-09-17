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
import { loadQueryGraph } from "./load-query-graph.js";
import { createCache } from "./cache.js";
import { standardHandlers, defaultConfig } from "./default-config.js";
import { mapValues } from "es-toolkit";
import { compileResourceMappers } from "./helpers/helpers.js";

/**
 * Helper to handle Response objects from standard handler or return direct data
 * @param {*} result - The result from a handler (Response object or direct data)
 * @param {*} fallbackValue - Value to return for empty responses (used by delete)
 * @returns {Promise<*>} Parsed response data
 */
async function handleHandlerResult(result, fallbackValue = null) {
	// Handle Response objects (from standard handler)
	if (result && typeof result.ok === "boolean") {
		if (!result.ok) {
			const errorData = await result.json().catch(() => ({
				message: result.statusText,
			}));
			throw new Error(errorData.message || `HTTP ${result.status}`, {
				cause: { data: errorData, originalError: result },
			});
		}

		// For DELETE operations, some APIs return empty response
		if (fallbackValue !== null) {
			const text = await result.text();
			return text ? JSON.parse(text) : fallbackValue;
		}

		return result.json();
	}

	// Handle direct data (from custom handlers)
	return result;
}

export function createMultiApiStore(schema, config = {}) {
	ensureValidSchema(schema);

	// normalize config
	const normalConfig = {
		middleware: [],
		specialHandlers: [],
		...config,
		// Handle baseURL at root level for backwards compatibility
		request: {
			...defaultConfig.request,
			...config.request,
			...(config.baseURL && { baseURL: config.baseURL }),
		},
		// Properly merge cache config to include defaults
		cache: {
			...defaultConfig.cache,
			...config.cache,
		},
		resources: mapValues(config.resources ?? {}, (resConfig, type) => {
			// Handle both shorthand format (get: fn) and full format (handlers: { get: { fetch: fn } })
			const handlers = {};

			// Check for shorthand handlers (get, create, update, delete directly on resConfig)
			for (const op of ["get", "create", "update", "delete"]) {
				if (resConfig[op]) {
					handlers[op] = {
						fetch: resConfig[op],
						map: (res) => res,
					};
				}
			}

			// Merge with explicit handlers config
			const explicitHandlers = mapValues(resConfig.handlers ?? {}, (h) => ({
				fetch: h.fetch,
				map: h.mappers
					? compileResourceMappers(schema, type, h.mappers)
					: (res) => res,
			}));

			return {
				...resConfig,
				handlers: { ...handlers, ...explicitHandlers },
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
			normalConfig.resources[type]?.create ??
			standardHandlers.create;

		// Clear cache for this resource type when creating
		cache.clearByType(type, normalConfig, { schema });

		const result = await createHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleHandlerResult(result);
	};

	const update = async (resource) => {
		const { type } = resource;

		ensureValidUpdateResource(schema, resource, validator);

		const updateHandler =
			normalConfig.resources[type]?.handlers?.update?.fetch ??
			normalConfig.resources[type]?.update ??
			standardHandlers.update;

		// Clear cache for this resource type when updating
		cache.clearByType(type, normalConfig, { schema });

		const result = await updateHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleHandlerResult(result);
	};

	const deleteResource = async (resource) => {
		const { type } = resource;

		ensureValidDeleteResource(schema, resource, validator);

		const deleteHandler =
			normalConfig.resources[type]?.handlers?.delete?.fetch ??
			normalConfig.resources[type]?.delete ??
			standardHandlers.delete;

		// Clear cache for this resource type when deleting
		cache.clearByType(type, normalConfig, { schema });

		const result = await deleteHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleHandlerResult(result, resource);
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
