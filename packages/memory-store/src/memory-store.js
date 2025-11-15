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
	storeMutation,
} from "@spectragraph/core";
import { create as createAction } from "./create.js";
import { deleteAction } from "./delete.js";
import { update as updateAction } from "./update.js";
import { merge } from "./merge.js";
import { createIdGenerator } from "./lib/store-helpers.js";

/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} MemoryStoreConfig
 * @property {import('@spectragraph/core').Graph} [initialData] - Initial graph data to populate the store
 * @property {Ajv} [validator] - Custom AJV validator instance (defaults to defaultValidator)
 * @property {import('@spectragraph/core').SelectExpressionEngine} [selectEngine] - Expression engine for SELECT clauses (defaults to defaultSelectEngine)
 * @property {import('@spectragraph/core').WhereExpressionEngine} [whereEngine] - Expression engine for WHERE clauses (defaults to defaultWhereEngine)
 */

/**
 * @typedef {Object} MemoryStoreContext
 * @property {import('@spectragraph/core').Schema} schema - The schema defining resource types and relationships
 * @property {Ajv} [validator] - AJV validator instance for resource validation
 * @property {MemoryStore} [store] - The memory store instance
 * @property {import('@spectragraph/core').Graph} storeGraph - The graph data structure containing all resources
 * @property {function(string): string|number} idGenerator - Function that generates IDs for resources
 */

/**
 * @typedef {import('@spectragraph/core').Store & {
 *   linkInverses: function(): void,
 *   merge: function(NormalResourceTree): Promise<NormalResourceTree>,
 *   merge: function(NormalResourceTree[]): Promise<NormalResourceTree[]>
 * }} MemoryStore
 */

/**
 * Creates a new in-memory store instance that implements the spectragraph store interface.
 * Provides CRUD operations, querying, and relationship management for graph data.
 *
 * @param {import('@spectragraph/core').Schema} schema - The schema defining resource types and relationships
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
	const idGenerator = createIdGenerator(schema, initialData);

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
	const create = storeMutation(schema, "create", (normalResource) => {
		ensureValidCreateResource(schema, normalResource, validator);
		return createAction(normalResource, { schema, storeGraph, idGenerator });
	});

	// WARNING: MUTATES storeGraph
	const update = storeMutation(schema, "update", (normalResource) => {
		ensureValidUpdateResource(schema, normalResource, validator);
		return updateAction(normalResource, { schema, storeGraph });
	});

	const upsert = storeMutation(schema, "upsert", (normalResource) =>
		"id" in normalResource && storeGraph[normalResource.type][normalResource.id]
			? update(normalResource)
			: create(normalResource),
	);

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
		async create(...args) {
			return Promise.resolve(create(...args));
		},
		async update(...args) {
			return Promise.resolve(update(...args));
		},
		async upsert(...args) {
			return Promise.resolve(upsert(...args));
		},
		async delete(...args) {
			return Promise.resolve(delete_(...args));
		},
		async query(query) {
			return Promise.resolve(runQuery(query));
		},
		async merge(resourceTreeOrTrees) {
			return merge(resourceTreeOrTrees, {
				schema,
				storeGraph,
				validator,
				idGenerator,
			});
		},
	};
}
