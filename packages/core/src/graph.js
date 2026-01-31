import { mapValues, uniq } from "es-toolkit";
import { applyOrMap } from "@spectragraph/utils";
import { validateSchema } from "./schema.js";
import { normalizeResource } from "./resource.js";
import { ensure } from "./lib/helpers.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object<string, Object<string, import('./resource.js').NormalResource>>} Graph
 */

/**
 * Creates an empty graph structure based on a schema
 *
 * @param {import('./schema.js').Schema} schema - The schema to base the graph on
 * @param {Object} [options]
 * @param {boolean} [options.skipValidation=false]
 * @returns {Graph} Empty graph structure
 */
export function createEmptyGraph(schema, options = {}) {
	const { skipValidation = false } = options;
	if (!skipValidation) ensure(validateSchema)(schema);
	return mapValues(schema.resources, () => ({}));
}

/**
 * Links inverse relationships in a graph
 *
 * This implementation uses a two-pass approach:
 * 1. Identify which resource types have missing inverse relationships
 * 2. Shallow-clone only those types, sharing references for unchanged types
 *
 * @param {import('./schema.js').Schema} schema - The schema defining relationships
 * @param {Graph} graph - The graph to link inverses in
 * @returns {Graph} Graph with inverse relationships linked
 */
export function linkInverses(schema, graph) {
	// Helper to convert ID to correct type based on schema
	const getTypedId = (resourceType, id) => {
		const idAttr = schema.resources[resourceType].idAttribute ?? "id";
		const idType = schema.resources[resourceType].attributes[idAttr]?.type;
		return idType === "integer" ? Number(id) : id;
	};

	// Pass 1: Identify which resource types need inverse relationships added
	const typesNeedingInverses = new Map();

	Object.entries(schema.resources).forEach(([resType, resSchema]) => {
		const sampleRes = Object.values(graph[resType])[0];
		if (!sampleRes) return;

		const missingRels = [];

		Object.entries(resSchema.relationships).forEach(([relName, relSchema]) => {
			const { cardinality, type: foreignType, inverse } = relSchema;

			if (sampleRes.relationships[relName] !== undefined || !inverse) return;

			// Build inverse map for this relationship
			const map = {};
			Object.entries(graph[foreignType]).forEach(([foreignId, foreignRes]) => {
				applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
					if (cardinality === "one") {
						map[foreignRef.id] = getTypedId(foreignType, foreignId);
					} else {
						if (!map[foreignRef.id]) map[foreignRef.id] = [];
						map[foreignRef.id].push(getTypedId(foreignType, foreignId));
					}
				});
			});

			missingRels.push({ relName, cardinality, foreignType, map });
		});

		if (missingRels.length > 0) {
			typesNeedingInverses.set(resType, missingRels);
		}
	});

	// Pass 2: Build output graph, shallow-cloning only modified types
	const output = {};

	Object.keys(schema.resources).forEach((resType) => {
		const missingRels = typesNeedingInverses.get(resType);

		if (!missingRels) {
			// No changes needed - share reference to original resource collection
			output[resType] = graph[resType];
			return;
		}

		// Shallow-clone resources in this type, adding inverse relationships
		output[resType] = {};

		Object.entries(graph[resType]).forEach(([localId, localRes]) => {
			// Shallow clone: new resource wrapper + new relationships object
			const newRes = {
				...localRes,
				relationships: { ...localRes.relationships },
			};

			// Fill in missing inverse relationships
			missingRels.forEach(({ relName, cardinality, foreignType, map }) => {
				newRes.relationships[relName] = map[localId]
					? cardinality === "one"
						? { type: foreignType, id: map[localId] }
						: map[localId].map((id) => ({ type: foreignType, id }))
					: cardinality === "one"
						? null
						: [];
			});

			output[resType][localId] = newRes;
		});
	});

	return output;
}

/**
 * Merges two graphs together by combining resource collections.
 * Right graph takes precedence for resources with conflicting IDs.
 *
 * @param {Graph} left - The left graph
 * @param {Graph} right - The right graph
 * @returns {Graph} Merged graph
 */
export function mergeGraphs(left, right) {
	const output = structuredClone(left);
	Object.entries(right).forEach(([resourceType, resources]) => {
		output[resourceType] = { ...(left[resourceType] ?? {}), ...resources };
	});
	return output;
}

/**
 * Merges two graphs together, merging individual resources with matching IDs using mergeNormalResources().
 *
 * @param {Graph} left - The left graph
 * @param {Graph} right - The right graph
 * @returns {Graph} Merged graph
 */
export function mergeGraphsDeep(left, right) {
	const output = {};
	const allTypes = uniq([...Object.keys(left), ...Object.keys(right)]);
	allTypes.forEach((type) => {
		const leftResources = left[type] ?? {};
		const rightResources = right[type] ?? {};

		if (Object.keys(rightResources).length === 0) {
			output[type] = leftResources;
			return;
		}

		if (Object.keys(leftResources).length === 0) {
			output[type] = rightResources;
			return;
		}

		const allIds = uniq([
			...Object.keys(leftResources),
			...Object.keys(rightResources),
		]);

		const nextResources = {};
		allIds.forEach((id) => {
			nextResources[id] = mergeNormalResources(
				leftResources[id] ?? { type, id },
				rightResources[id] ?? { type, id },
			);
		});

		output[type] = nextResources;
	});

	return output;
}

function mergeNormalResources(
	left,
	right = { attributes: {}, relationships: {} },
) {
	return {
		...left,
		attributes: { ...left.attributes, ...right.attributes },
		relationships: { ...left.relationships, ...right.relationships },
	};
}

/**
 * Takes an array of resources and creates a graph from all the resources given
 * as well as any nested resources, automatically linking them.
 *
 * @param {import('./schema.js').Schema} schema
 * @param {string} resourceType
 * @param {import('./resource.js').FlatResource[]} resources
 * @returns {Graph}
 */
export function createGraphFromResources(
	schema,
	rootResourceType,
	rootResources,
) {
	const output = createEmptyGraph(schema);

	const go = (resourceType, resource) => {
		const resourceSchema = schema.resources[resourceType];
		const idAttribute = resourceSchema.idAttribute ?? "id";

		// Convert ID to correct type based on schema
		const idType = resourceSchema.attributes[idAttribute]?.type;
		const resourceId =
			idType === "integer" && resource[idAttribute] !== undefined
				? Number(resource[idAttribute])
				: resource[idAttribute];

		output[resourceType][resourceId] = mergeNormalResources(
			normalizeResource(schema, resourceType, resource),
			output[resourceType][resourceId],
		);

		Object.entries(resourceSchema.relationships).forEach(
			([relName, relSchema]) => {
				const emptyRel = relSchema.cardinality === "many" ? [] : null;
				return applyOrMap(resource[relName] ?? emptyRel, (relRes) => {
					if (typeof relRes === "object") go(relSchema.type, relRes);
				});
			},
		);
	};

	rootResources.forEach((r) => {
		go(rootResourceType, r);
	});

	return output;
}

/**
 * Takes an array of normal resources and creates a graph from them
 *
 * @param {import('./schema.js').Schema} schema
 * @param {import('./resource.js').NormalResource[]} normalResources
 * @returns {Graph}
 */
export function createGraphFromNormalResources(schema, normalResources) {
	const output = createEmptyGraph(schema);
	normalResources.forEach((resource) => {
		output[resource.type][resource.id] = resource;
	});

	return output;
}
