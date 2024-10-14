import Ajv from "ajv";
import { v4 as uuidv4 } from "uuid";
import { mapValues } from "lodash-es";
import { Schema } from "./schema.js";
import {
	createQueryGraph,
	createEmptyGraph,
	linkInverses,
	mergeGraphs,
} from "./graph.js";
import { createGraphFromTrees } from "./mappers.js";
import { createOrUpdate } from "./create-or-update.js";
import { deleteAction } from "./delete.js";
import { ensureValidQuery } from "./query.js";
import {
	defaultValidator,
	validateCreateResource,
	validateDeleteResource,
	validateUpdateResource,
} from "./validate.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

export type Ref = {
	type: string;
	id: string | number;
};

export type NormalResource = {
	id?: number | string;
	type?: string;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
};

export type Graph = {
	[k: string]: {
		[k: string | number]: NormalResource;
	};
};

export type MemoryStoreConfig = {
	initialData?: Graph;
	validator?: Ajv;
};

export function createMemoryStore(
	schema: Schema,
	config: MemoryStoreConfig = {},
) {
	const { initialData = {}, validator = defaultValidator } = config;

	let queryGraph;
	let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);

	const runQuery = (query) => {
		if (!queryGraph) queryGraph = createQueryGraph(storeGraph);

		ensureValidQuery(schema, query);
		return queryGraph.query(query);
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

		const normalRes: NormalResource = {
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

		const normalRes: NormalResource = {
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

	const delete_ = (resource) => {
		const errors = validateDeleteResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		queryGraph = null;
		return deleteAction(resource, { schema, storeGraph });
	};

	const merge = (graph: Graph) => {
		queryGraph = null;
		storeGraph = mergeGraphs(storeGraph, graph);
	};

	const mergeTrees = (
		resourceType: string,
		trees: { [k: string]: unknown }[],
		mappers = {},
	) => {
		const graph = createGraphFromTrees(resourceType, trees, schema, mappers);
		merge(graph);
	};

	const mergeTree = (
		resourceType: string,
		tree: { [k: string]: unknown },
		mappers = {},
	) => {
		mergeTrees(resourceType, [tree], mappers);
	};

	const linkStoreInverses = () => {
		queryGraph = null;
		storeGraph = linkInverses(storeGraph, schema);
	};

	return {
		linkInverses: linkStoreInverses,
		create,
		update,
		delete: delete_,
		merge,
		mergeTree,
		mergeTrees,
		query: runQuery,
	};
}
