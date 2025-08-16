import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import {
	ensureValidSchema,
	ensureValidQuery,
	normalizeQuery,
	createEmptyGraph,
	linkInverses,
	mergeGraphs,
	queryGraph,
	createValidator,
	ensureValidCreateResource,
	ensureValidDeleteResource,
	ensureValidUpdateResource,
} from "@data-prism/core";
import { createOrUpdate } from "./create-or-update.js";
import { deleteAction } from "./delete.js";
import { splice } from "./splice.js";


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
 * @property {Ajv} [validator] - Custom AJV validator instance (defaults to createValidator())
 */



/**
 * @typedef {Object} Store
 * @property {function(string, string): import('@data-prism/core').NormalResource} getOne
 * @property {function(import('@data-prism/core').CreateResource): import('@data-prism/core').NormalResource} create
 * @property {function(import('@data-prism/core').UpdateResource): import('@data-prism/core').NormalResource} update
 * @property {function(import('@data-prism/core').CreateResource | import('@data-prism/core').UpdateResource): import('@data-prism/core').NormalResource} upsert
 * @property {function(import('@data-prism/core').DeleteResource): import('@data-prism/core').DeleteResource} delete
 * @property {function(import('@data-prism/core').RootQuery): any} query
 * @property {function(NormalResourceTree): NormalResourceTree} splice
 */

/**
 * @typedef {Store & {
 *   linkInverses: function(): void,
 *   merge: function(import('@data-prism/core').Graph): void
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
	const { initialData = {}, validator = createValidator() } = config;

	ensureValidSchema(schema, { validator });

	let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);

	const runQuery = (query) => {
		const normalQuery = normalizeQuery(schema, query);

		ensureValidQuery(schema, normalQuery);
		return queryGraph(schema, normalQuery, storeGraph);
	};

	// WARNING: MUTATES storeGraph
	const create = (resource) => {
		const { id, type } = resource;
		const resSchema = schema.resources[resource.type];
		const { idAttribute = "id" } = resSchema;
		const newId = id ?? uuidv4();

		ensureValidCreateResource(schema, resource, validator);

		const normalRes = {
			attributes: { ...(resource.attributes ?? {}), [idAttribute]: newId },
			relationships: mapValues(
				resSchema.relationships,
				(rel, relName) =>
					resource.relationships?.[relName] ??
					(rel.cardinality === "one" ? null : []),
			),
			id: newId,
			type,
		};

		return createOrUpdate(normalRes, { schema, storeGraph });
	};

	// WARNING: MUTATES storeGraph
	const update = (resource) => {
		ensureValidUpdateResource(schema, resource, validator);

		const existingRes = storeGraph[resource.type][resource.id];

		const normalRes = {
			...resource,
			attributes: { ...existingRes.attributes, ...resource.attributes },
			relationships: {
				...existingRes.relationships,
				...resource.relationships,
			},
		};

		// WARNING: MUTATES storeGraph
		return createOrUpdate(normalRes, { schema, storeGraph });
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
	const merge = (graph) => {
		storeGraph = mergeGraphs(storeGraph, graph);
	};

	// WARNING: MUTATES storeGraph
	const linkStoreInverses = () => {
		storeGraph = linkInverses(storeGraph, schema);
	};

	return {
		linkInverses: linkStoreInverses,
		getOne(type, id) {
			return storeGraph[type][id] ?? null;
		},
		create,
		update,
		upsert,
		delete: delete_,
		merge,
		query: runQuery,
		splice(resource) {
			return splice(resource, { schema, validator, store: this, storeGraph });
		},
	};
}
