import { createGraphFromResources } from "@spectragraph/core";

export const FINALIZED = Symbol("spectragraph.finalized");

/**
 * Creates finalizer functions for a handler.
 *
 * @param {import('@spectragraph/core').Schema} schema
 * @param {string} queryType
 * @param {import('../default-config.js').ResourceOperationConfig} [queryConfig] - Query operation config with optional mapper
 * @returns {{ finalize: Function, finalizeResources: Function, finalizeResource: Function }}
 */
export function createFinalizers(schema, queryType, queryConfig = {}) {
	// Build empty graph with all resource types from schema
	const emptyGraph = Object.keys(schema.resources).reduce(
		(acc, type) => ({ ...acc, [type]: {} }),
		{},
	);

	const mapper = queryConfig.map;

	return {
		/**
		 * Finalizes a graph directly. Use when the handler has already built
		 * a graph (possibly containing multiple resource types).
		 *
		 * @param {import('@spectragraph/core').Graph} graph
		 * @returns {{ [FINALIZED]: true, graph: Object }}
		 */
		finalize(graph) {
			// Merge with empty graph to ensure all resource types exist
			return { [FINALIZED]: true, graph: { ...emptyGraph, ...graph } };
		},

		/**
		 * Finalizes an array of resources. Converts them to a graph internally.
		 *
		 * @param {Object[]} resources
		 * @returns {{ [FINALIZED]: true, graph: Object }}
		 */
		finalizeResources(resources) {
			const mapped = mapper ? resources.map((r) => mapper(r)) : resources;
			const graph = createGraphFromResources(schema, queryType, mapped);
			return { [FINALIZED]: true, graph };
		},

		/**
		 * Finalizes a single resource. Convenience wrapper around finalizeResources.
		 *
		 * @param {Object} resource
		 * @returns {{ [FINALIZED]: true, graph: Object }}
		 */
		finalizeResource(resource) {
			const resources = resource == null ? [] : [resource];
			const mapped = mapper ? resources.map((r) => mapper(r)) : resources;
			const graph = createGraphFromResources(schema, queryType, mapped);
			return { [FINALIZED]: true, graph };
		},
	};
}

/**
 * Strips handled clauses from a query tree based on resource config.
 * Walks the query recursively, removing clauses that config declares as handled.
 *
 * @param {import('@spectragraph/core').NormalRootQuery} query
 * @param {import('@spectragraph/core').Schema} schema
 * @param {Object} resourcesConfig - The resources config from store config
 * @returns {import('@spectragraph/core').NormalRootQuery}
 */
export function stripHandledClauses(query, schema, resourcesConfig) {
	const handles = resourcesConfig[query.type]?.query?.handles ?? {};
	const stripped = { ...query };

	if (handles.slice) delete stripped.slice;
	if (handles.where) delete stripped.where;
	if (handles.order) delete stripped.order;

	// Recursively strip subqueries in select
	const relationships = schema.resources[query.type]?.relationships ?? {};
	const newSelect = { ...stripped.select };

	for (const [key, subquery] of Object.entries(newSelect)) {
		if (key in relationships && typeof subquery === "object" && subquery.type) {
			newSelect[key] = stripHandledClauses(subquery, schema, resourcesConfig);
		}
	}

	stripped.select = newSelect;
	return stripped;
}
