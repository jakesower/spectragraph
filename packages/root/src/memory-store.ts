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
	validateResourceTree,
	validateUpdateResource,
} from "./validate.js";
import { applyOrMap } from "@data-prism/utils";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

export type Ref = {
	type: string;
	id: string | number;
};

export type NormalResource = {
	id?: number | string;
	type?: string;
	new?: boolean;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
};

export type NormalResourceTree = {
	type: string;
	id?: number | string;
	new?: boolean;
	attributes?: { [k: string]: unknown };
	relationships?: {
		[k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
	};
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

	const splice = (resource: NormalResourceTree): void => {
		const errors = validateResourceTree(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		const expectedExistingResources = (res: NormalResourceTree): Ref[] => {
			const related = Object.values(res.relationships ?? {}).flatMap((rel) =>
				rel
					? Array.isArray(rel)
						? rel.flatMap((r) =>
								("attributes" in r || "relationships" in r) && "id" in r
									? expectedExistingResources(r as NormalResourceTree)
									: (rel as unknown as Ref),
							)
						: "attributes" in rel || "relationships" in rel
							? expectedExistingResources(rel as NormalResourceTree)
							: (rel as unknown as Ref)
					: null,
			);

			return res.new || !res.id
				? related
				: [{ type: res.type, id: res.id }, ...related];
		};

		const missing = expectedExistingResources(resource)
			.filter((ref) => ref && ref.id)
			.find(({ type, id }) => !storeGraph[type][id]);
		if (missing) {
			throw new Error(
				`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
			);
		}

		const go = (
			res: NormalResourceTree,
			parent: NormalResourceTree = null,
			parentRelSchema = null,
		): void => {
			const resSchema = schema.resources[res.type];
			const resCopy = structuredClone(res);
			const { inverse } = parentRelSchema;

			if (parent && inverse) {
				const relSchema = resSchema.relationships[inverse];
				resCopy.relationships = resCopy.relationships ?? {};
				if (
					relSchema.cardinality === "many" &&
					(
						(resCopy.relationships[inverse] ?? []) as
							| Ref[]
							| NormalResourceTree[]
					).some((r) => r.id === res.id)
				) {
					resCopy.relationships[inverse] = [
						...(resCopy.relationships[inverse] as Ref[] | NormalResourceTree[]),
						{ type: parent.type, id: parent.id },
					];
				} else if (relSchema.cardinality === "one") {
					const existing = storeGraph[parent.type][parent.id];
					const existingRef = existing?.relationships?.[inverse] as Ref;

					if (existingRef && existingRef.id !== parent.id) {
						update({
							...existing,
							relationships: { ...existing.relationships, [inverse]: null },
						});
					}

					resCopy.relationships[inverse] = { type: parent.type, id: parent.id };
				}
			}

			const saved =
				resource.new || !resource.id ? create(resource) : update(resource);

			Object.entries(saved.relationships).forEach(([relName, rel]) => {
				const relSchema = resSchema.relationships[relName];
				const step = (relRes) =>
					relRes.attributes || relRes.relationships
						? go(relRes, resource, relSchema)
						: relRes;

				applyOrMap(rel, step);
			});
		};
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
		splice,
	};
}
