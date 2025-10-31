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
	storeMutation,
} from "@spectragraph/core";
import { mapValues } from "es-toolkit";
import { loadQueryGraph } from "./load-query-graph.js";
import { createCache } from "./cache.js";
import { standardHandlers, defaultConfig } from "./default-config.js";
import { handleResponseData, normalizeConfig } from "./helpers/helpers.js";

/**
 * @typedef {Object} StoreContext
 * @property {import('@spectragraph/core').Schema} schema - The schema defining resource types and relationships
 * @property {import('./default-config.js').NormalConfig} config - Normalized store configuration
 * @property {Function} withCache - Cache wrapper function
 * @property {Object} cache - Cache instance with methods for clearing and managing cache entries
 */

/**
 * Creates a multi-API store that can delegate operations to different API handlers.
 * Supports custom handlers, caching, middleware, and relationship-aware cache invalidation.
 *
 * @param {import('@spectragraph/core').Schema} schema - The schema defining resource types and relationships
 * @param {import('./default-config.js').StoreConfig} [config={}] - Configuration object
 * @returns {import('@spectragraph/core').Store} Store instance with query, create, update, delete, and upsert methods
 */
export function createMultiApiStore(schema, config = {}) {
	ensureValidSchema(schema);

	// normalize config
	const normalConfig = normalizeConfig({
		middleware: [],
		...config,
		specialHandlers: config.specialHandlers
			? config.specialHandlers.map(normalizeConfig)
			: [],
		request: {
			...defaultConfig.request,
			...config.request,
		},
		cache: {
			...defaultConfig.cache,
			...config.cache,
		},
		resources: mapValues(config.resources ?? {}, (resConfig, type) =>
			normalizeConfig(resConfig, type, schema),
		),
	});

	const {
		validator = defaultValidator,
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = normalConfig;

	const cache = createCache(normalConfig);

	/** @type {StoreContext} */
	const storeContext = {
		schema,
		config: normalConfig,
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

	const create = storeMutation(schema, "create", async (resource) => {
		const { type } = resource;

		ensureValidCreateResource(schema, resource, validator);

		const createHandler =
			normalConfig.resources[type]?.create?.fetch ?? standardHandlers.create;

		// Clear cache for this resource type when creating
		cache.clearByType(type, normalConfig, { schema });

		const result = await createHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleResponseData(result);
	});

	const update = storeMutation(schema, "update", async (resource) => {
		const { type } = resource;

		ensureValidUpdateResource(schema, resource, validator);

		const updateHandler =
			normalConfig.resources[type]?.update?.fetch ?? standardHandlers.update;

		// Clear cache for this resource type when updating
		cache.clearByType(type, normalConfig, { schema });

		const result = await updateHandler(resource, {
			schema,
			config: normalConfig,
		});

		return handleResponseData(result);
	});

	const deleteResource = async (resource) => {
		const { type } = resource;

		ensureValidDeleteResource(schema, resource, validator);

		const deleteHandler =
			normalConfig.resources[type]?.delete?.fetch ?? standardHandlers.delete;

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
		async upsert(...args) {
			return storeMutation(schema, "upsert", (resource) =>
				resource.id ? this.update(resource) : this.create(resource),
			)(...args);
		},
		delete: deleteResource,
		merge: () => {
			throw new StoreOperationNotSupportedError("merge", "multi-api-store");
		},
	};
}
