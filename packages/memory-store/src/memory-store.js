import {
	ensureValidSchema,
	normalizeQuery,
	createEmptyGraph,
	linkInverses,
	mergeGraphsDeep,
	queryGraph,
	ensureValidCreateResource,
	ensureValidDeleteResource,
	ensureValidUpdateResource,
	defaultValidator,
	defaultSelectEngine,
	defaultWhereEngine,
} from "@data-prism/core";
import { create as createAction } from "./create.js";
import { deleteAction } from "./delete.js";
import { update as updateAction } from "./update.js";
import { merge } from "./merge.js";

/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} MemoryStoreConfig
 * @property {import('@data-prism/core').Graph} [initialData] - Initial graph data to populate the store
 * @property {Ajv} [validator] - Custom AJV validator instance (defaults to defaultValidator)
 * @property {import('@data-prism/core').SelectExpressionEngine} [selectEngine] - Expression engine for SELECT clauses (defaults to defaultSelectEngine)
 * @property {import('@data-prism/core').WhereExpressionEngine} [whereEngine] - Expression engine for WHERE clauses (defaults to defaultWhereEngine)
 */

/**
 * @typedef {Object} MemoryStoreContext
 * @property {import('@data-prism/core').Schema} schema - The schema defining resource types and relationships
 * @property {Ajv} [validator] - AJV validator instance for resource validation
 * @property {MemoryStore} [store] - The memory store instance
 * @property {import('@data-prism/core').Graph} storeGraph - The graph data structure containing all resources
 */

/**
 * @typedef {import('@data-prism/core').Store & {
 *   linkInverses: function(): void,
 *   merge: function(NormalResourceTree): Promise<NormalResourceTree>,
 *   merge: function(NormalResourceTree[]): Promise<NormalResourceTree[]>
 * }} MemoryStore
 */

/**
 * Creates a new in-memory store instance that implements the data-prism store interface.
 * Provides CRUD operations, querying, and relationship management for graph data.
 *
 * @param {import('@data-prism/core').Schema} schema - The schema defining resource types and relationships
 * @param {MemoryStoreConfig} [config={}] - Configuration options for the store
 * @returns {MemoryStore} A new memory store instance
 */
export function createMemoryStore(schema, config = {}) {
	const {
		initialData = {},
		validator = defaultValidator,
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = config;

	ensureValidSchema(schema, { validator });

	let storeGraph = mergeGraphsDeep(createEmptyGraph(schema), initialData);

	const runQuery = (query) => {
		const normalQuery = normalizeQuery(schema, query, {
			selectEngine,
			whereEngine,
		});

		return queryGraph(schema, normalQuery, storeGraph, {
			selectEngine,
			whereEngine,
		});
	};

	// WARNING: MUTATES storeGraph
	const create = (resource) => {
		ensureValidCreateResource(schema, resource, validator);
		return createAction(resource, { schema, storeGraph });
	};

	// WARNING: MUTATES storeGraph
	const update = (resource) => {
		ensureValidUpdateResource(schema, resource, validator);
		return updateAction(resource, { schema, storeGraph });
	};

	const upsert = (resource) => {
		return "id" in resource && storeGraph[resource.type][resource.id]
			? update(resource)
			: create(resource);
	};

	const delete_ = (resource) => {
		ensureValidDeleteResource(schema, resource, validator);
		return deleteAction(resource, { schema, storeGraph });
	};

	// WARNING: MUTATES storeGraph
	const linkStoreInverses = () => {
		storeGraph = linkInverses(schema, storeGraph);
	};

	return {
		linkInverses: linkStoreInverses,
		async create(resource) {
			return Promise.resolve(create(resource));
		},
		async update(resource) {
			return Promise.resolve(update(resource));
		},
		async upsert(resource) {
			return Promise.resolve(upsert(resource));
		},
		async delete(resource) {
			return Promise.resolve(delete_(resource));
		},
		async query(query) {
			return Promise.resolve(runQuery(query));
		},
		async merge(resourceTreeOrTrees) {
			return merge(resourceTreeOrTrees, { schema, storeGraph, validator });
		},
	};
}
