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
import { deleteAction, DeleteResource } from "./delete.js";
import { ensureValidQuery, RootQuery } from "./query.js";
import {
	defaultValidator,
	validateCreateResource,
	validateDeleteResource,
	validateUpdateResource,
} from "./validate.js";
import { splice } from "./splice.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

export type Ref = {
	type: string;
	id: string;
};

export type NormalResource = {
	id?: string;
	type?: string;
	new?: boolean;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
};

export type NormalResourceTree = {
	type: string;
	id?: string;
	new?: boolean;
	attributes?: { [k: string]: unknown };
	relationships?: {
		[k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
	};
};

export type Graph = {
	[k: string]: {
		[k: string]: NormalResource;
	};
};

export type MemoryStoreConfig = {
	initialData?: Graph;
	validator?: Ajv;
};

type CreateResource =
	| {
			type: string;
			attributes?: { [k: string]: unknown };
			relationships?: { [k: string]: Ref | Ref[] };
	  }
	| {
			type: string;
			id: string;
			new: true;
			attributes?: { [k: string]: unknown };
			relationships?: { [k: string]: Ref | Ref[] };
	  };

type UpdateResource = {
	type: string;
	id: string;
	new?: false;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] };
};

export type Store = {
	getOne: (type: string, id: string) => NormalResource;
	create: (resource: CreateResource) => NormalResource;
	update: (resource: UpdateResource) => NormalResource;
	delete: (resource: DeleteResource) => DeleteResource;
	query: (query: RootQuery) => any;
	splice: (resource: NormalResourceTree) => NormalResourceTree;
};

export type MemoryStore = Store & {
	linkInverses: () => void;
	merge: (graph: Graph) => void;
	mergeTree: (resourceType: string, tree: any, mappers?: any) => void;
	mergeTrees: (resourceType: string, trees: any[], mappers?: any) => void;
};

export function createMemoryStore(
	schema: Schema,
	config: MemoryStoreConfig = {},
): MemoryStore {
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
	const update = (resource: UpdateResource) => {
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

	const delete_ = (resource: DeleteResource) => {
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
		getOne(type: string, id: string): NormalResource {
			return storeGraph[type][id] ?? null;
		},
		create,
		update,
		delete: delete_,
		merge,
		mergeTree,
		mergeTrees,
		query: runQuery,
		splice(resource) {
			return splice(schema, resource, validator, this);
		},
	};
}
