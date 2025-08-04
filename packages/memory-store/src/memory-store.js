import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import { ensureValidSchema } from "./schema.js";
import {
	createQueryGraph,
	createEmptyGraph,
	linkInverses,
	mergeGraphs,
} from "./graph.js";
import { createGraphFromTrees } from "./mappers.js";
import { createOrUpdate } from "./create-or-update.js";
import { deleteAction } from "./delete.js";
import { ensureValidQuery, normalizeQuery } from "./query.js";
import {
	defaultValidator,
	validateCreateResource,
	validateDeleteResource,
	validateUpdateResource,
} from "./validate.js";
import { splice } from "./splice.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} MemoryStoreConfig
 * @property {import('./graph.js').Graph} [initialData]
 * @property {Ajv} [validator]
 */

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {string} [id]
 * @property {boolean} [new]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {string} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} Store
 * @property {function(string, string): import('./graph.js').NormalResource} getOne
 * @property {function(CreateResource): import('./graph.js').NormalResource} create
 * @property {function(UpdateResource): import('./graph.js').NormalResource} update
 * @property {function(CreateResource | UpdateResource): import('./graph.js').NormalResource} upsert
 * @property {function(import('./delete.js').DeleteResource): import('./delete.js').DeleteResource} delete
 * @property {function(import('./query.js').RootQuery): any} query
 * @property {function(NormalResourceTree): NormalResourceTree} splice
 */

/**
 * @typedef {Store & {
 *   linkInverses: function(): void,
 *   merge: function(import('./graph.js').Graph): void,
 *   mergeTree: function(string, any, any?): void,
 *   mergeTrees: function(string, any[], any?): void
 * }} MemoryStore
 */

/**
 * @param {import('./schema.js').Schema} schema
 * @param {MemoryStoreConfig} [config={}]
 * @returns {MemoryStore}
 */
export function createMemoryStore(schema, config = {}) {
	const { initialData = {}, validator = defaultValidator } = config;

	ensureValidSchema(schema);

	let queryGraph;
	let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);

	const runQuery = (query) => {
		if (!queryGraph) queryGraph = createQueryGraph(storeGraph);
		const normalQuery = normalizeQuery(schema, query);

		ensureValidQuery(schema, normalQuery);
		return queryGraph.query(normalQuery);
	};

	// WARNING: MUTATES storeGraph
	const create = (resource) => {
		const { id, type } = resource;
		const resSchema = schema.resources[resource.type];
		const { idAttribute = "id" } = resSchema;
		const newId = id ?? uuidv4();

		const errors = validateCreateResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		/** @type {import('./graph.js').NormalResource} */
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

		queryGraph = null;
		return createOrUpdate(normalRes, { schema, storeGraph });
	};

	// WARNING: MUTATES storeGraph
	const update = (resource) => {
		const errors = validateUpdateResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		const existingRes = storeGraph[resource.type][resource.id];

		/** @type {import('./graph.js').NormalResource} */
		const normalRes = {
			...resource,
			attributes: { ...existingRes.attributes, ...resource.attributes },
			relationships: {
				...existingRes.relationships,
				...resource.relationships,
			},
		};

		// WARNING: MUTATES storeGraph
		queryGraph = null;
		return createOrUpdate(normalRes, { schema, storeGraph });
	};

	const upsert = (resource) => {
		return "id" in resource && storeGraph[resource.type][resource.id]
			? update(resource)
			: create(resource);
	};

	const delete_ = (resource) => {
		const errors = validateDeleteResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		queryGraph = null;
		return deleteAction(resource, { schema, storeGraph });
	};

	const merge = (graph) => {
		queryGraph = null;
		storeGraph = mergeGraphs(storeGraph, graph);
	};

	const mergeTrees = (resourceType, trees, mappers = {}) => {
		const graph = createGraphFromTrees(resourceType, trees, schema, mappers);
		merge(graph);
	};

	const mergeTree = (resourceType, tree, mappers = {}) => {
		mergeTrees(resourceType, [tree], mappers);
	};

	const linkStoreInverses = () => {
		queryGraph = null;
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
		mergeTree,
		mergeTrees,
		query: runQuery,
		splice(resource) {
			queryGraph = null;
			return splice(resource, { schema, validator, store: this, storeGraph });
		},
	};
}
