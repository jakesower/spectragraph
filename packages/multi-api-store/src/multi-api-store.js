import {
	ensureValidSchema,
	normalizeQuery,
	queryGraph,
	StoreOperationNotSupportedError,
	validateCreateResource,
	validateUpdateResource,
	validateDeleteResource,
	defaultValidator,
	defaultSelectEngine,
	defaultWhereEngine,
} from "@data-prism/core";
import { loadQueryGraph } from "./load-query-graph.js";
import { createCache } from "./cache.js";
import { standardHandler } from "./standard-handler.js";

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

	const create = (resource) => {
		const { type } = resource;

		const errors = validateCreateResource(schema, resource, { validator });
		if (errors.length > 0) {
			throw new Error(`invalid ${resource?.type} resource`, { cause: errors });
		}

		const createHandler =
			config.resources[type]?.create ?? standardHandler.create;

		// Clear cache for this resource type when creating
		cache.clearByType(type);

		return createHandler(resource, { schema, config });
	};

	const update = (resource) => {
		const { type } = resource;

		const errors = validateUpdateResource(schema, resource, { validator });
		if (errors.length > 0) {
			throw new Error(`invalid ${resource?.type} resource`, { cause: errors });
		}

		const updateHandler =
			config.resources[type]?.update ?? standardHandler.update;

		// Clear cache for this resource type when updating
		cache.clearByType(type);

		return updateHandler(resource, { schema, config });
	};

	const deleteResource = (resource) => {
		const { type } = resource;

		const errors = validateDeleteResource(schema, resource);
		if (errors.length > 0) {
			throw new Error("invalid resource", { cause: errors });
		}

		const deleteHandler =
			config.resources[type]?.delete ?? standardHandler.delete;

		// Clear cache for this resource type when deleting
		cache.clearByType(type);

		return deleteHandler(resource, { schema, config });
	};

	return {
		query: runQuery,
		create,
		update,
		upsert(resource) {
			return resource.id ? this.update(resource) : this.create(resource);
		},
		delete: deleteResource,
		merge: () => {
			throw new StoreOperationNotSupportedError("merge", "multi-api-store");
		},
	};
}
