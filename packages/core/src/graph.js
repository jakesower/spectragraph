import { mapValues } from "lodash-es";
import { validateSchema } from "./schema.js";
import { applyOrMap } from "@data-prism/utils";
import { normalizeResource } from "./resource.js";
import { ensure } from "./lib/helpers.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} NormalResource
 * @property {string} id
 * @property {string} type
 * @property {Object<string, *>} attributes
 * @property {Object<string, Ref|Ref[]|null>} relationships
 */

/**
 * @typedef {Object<string, Object<string, NormalResource>>} Graph
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
 * @param {import('./schema.js').Schema} schema - The schema defining relationships
 * @param {Graph} graph - The graph to link inverses in
 * @returns {Graph} Graph with inverse relationships linked
 */
export function linkInverses(schema, graph) {
	const output = structuredClone(graph);

	Object.entries(schema.resources).forEach(([resType, resSchema]) => {
		const sampleRes = Object.values(graph[resType])[0];
		if (!sampleRes) return;

		Object.entries(resSchema.relationships).forEach(([relName, relSchema]) => {
			const { cardinality, type: foreignType, inverse } = relSchema;

			if (sampleRes.relationships[relName] !== undefined || !inverse) return;

			if (cardinality === "one") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							map[foreignRef.id] = foreignId;
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? { type: foreignType, id: map[localId] }
						: null;
				});
			} else if (cardinality === "many") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							if (!map[foreignRef.id]) map[foreignRef.id] = [];
							map[foreignRef.id].push(foreignId);
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? map[localId].map((id) => ({ type: foreignType, id }))
						: [];
				});
			}
		});
	});

	return output;
}

/**
 * Merges two graphs together
 *
 * @param {Graph} left - The left graph
 * @param {Graph} right - The right graph
 * @returns {Graph} Merged graph
 */
export function mergeGraphs(left, right) {
	const output = structuredClone(left);
	Object.entries(right).forEach(([resourceType, resources]) => {
		output[resourceType] = { ...resources, ...(left[resourceType] ?? {}) };
	});

	return output;
}

function mergeResources(left, right = { attributes: {}, relationships: {} }) {
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
 * @param {Object[]} resources
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
		const resourceId = resource[idAttribute];

		output[resourceType][resourceId] = mergeResources(
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
