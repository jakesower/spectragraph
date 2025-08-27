import { omit } from "lodash-es";
import { normalizeQuery, queryGraph } from "@data-prism/core";
import { extractGraph } from "../extract-graph.js";

/**
 * Processes raw SQL results into final query response
 * @param {any[][]} rawResults - Raw SQL query results 
 * @param {Object} composedClauses - Composed SQL clauses
 * @param {import('data-prism').RootQuery} query - Original query
 * @param {Object} context - Query context with schema and config
 * @returns {any} Final query results
 */
export function processQueryResults(rawResults, composedClauses, query, context) {
	const { schema } = context;

	// Determine if we have to-many relationships that affect result processing
	const hasToManyJoin = Object.keys(normalizeQuery(schema, query).select).some(
		(k) =>
			schema.resources[query.type].relationships[k]?.cardinality === "many",
	);

	const handledClauses = hasToManyJoin
		? ["where"]
		: ["limit", "offset", "where"];

	// Transform raw results into resource graph
	const graph = extractGraph(rawResults, composedClauses.select, context);
	
	// Strip handled clauses from query for final processing
	const strippedQuery = omit(query, handledClauses);

	return queryGraph(schema, strippedQuery, graph);
}