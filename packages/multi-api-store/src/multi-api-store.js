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
} from "@data-prism/core";
import { loadQueryGraph } from "./load-query-graph.js";
import { createCache } from "./cache.js";
import { standardHandler } from "./standard-handler.js";

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
				cause: { data: errorData, response: result },
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

export function createMultiApiStore(schema, config) {
	ensureValidSchema(schema);

	if (typeof config?.resources !== "object") {
		throw new Error(
			"config.resources must be an object describing the configuration for each resource",
		);
	}

	const {
		cache: cacheConfig,
		validator = defaultValidator,
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
		specialHandlers = [],
	} = config;

	// Extract per-resource cache key generators from resource configs
	const resourceKeyGenerators = {};
	Object.entries(config.resources).forEach(([type, resourceConfig]) => {
		if (resourceConfig.cacheKeyGenerator) {
			resourceKeyGenerators[type] = resourceConfig.cacheKeyGenerator;
		}
	});

	const cache = createCache({
		...cacheConfig,
		resourceKeyGenerators,
	});

	const storeContext = {
		schema,
		config,
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
			config.resources[type]?.create ?? standardHandler.create;

		// Clear cache for this resource type when creating
		cache.clearByType(type);

		const result = await createHandler(resource, { schema, config });
		return handleHandlerResult(result);
	};

	const update = async (resource) => {
		const { type } = resource;

		ensureValidUpdateResource(schema, resource, validator);

		const updateHandler =
			config.resources[type]?.update ?? standardHandler.update;

		// Clear cache for this resource type when updating
		cache.clearByType(type);

		const result = await updateHandler(resource, { schema, config });
		return handleHandlerResult(result);
	};

	const deleteResource = async (resource) => {
		const { type } = resource;

		ensureValidDeleteResource(schema, resource, validator);

		const deleteHandler =
			config.resources[type]?.delete ?? standardHandler.delete;

		// Clear cache for this resource type when deleting
		cache.clearByType(type);

		const result = await deleteHandler(resource, { schema, config });
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
