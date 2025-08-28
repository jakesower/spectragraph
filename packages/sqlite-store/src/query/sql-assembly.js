import { mapValues } from "lodash-es";
import { createVarsExpressionEngine } from "../helpers/where-expressions.js";
import { SQL_CLAUSE_CONFIG } from "./clause-config.js";

/**
 * Combines parsed query clauses into single values for each clause type
 * @param {any[]} clauseBreakdown - Array of clause objects from extractQueryClauses
 * @param {Object} initialClauses - Initial values for each clause type
 * @returns {Object} Object with composed clause values
 */
export function composeSqlClauses(clauseBreakdown, initialClauses) {
	return clauseBreakdown.reduce(
		(acc, clause) => ({
			...acc,
			...mapValues(clause, (val, key) =>
				SQL_CLAUSE_CONFIG[key].compose(acc[key], val),
			),
		}),
		initialClauses,
	);
}

/**
 * Generates SQL string from composed clause values
 * @param {Object} composedClauses - Composed clause values
 * @param {import('../sqlite-store.js').Context} context
 * @returns {string} Complete SQL query string with ? placeholders for SQLite
 */
export function assembleSqlQuery(composedClauses, context) {
	return Object.entries(SQL_CLAUSE_CONFIG)
		.map(([k, v]) => v.toSql(composedClauses[k], context))
		.filter(Boolean)
		.join("\n");
}

/**
 * Extracts SQL parameters/variables from composed clause values
 * @param {Object} composedClauses - Composed clause values
 * @param {import('../sqlite-store.js').Context} context - Store context with db
 * @returns {any[]} Array of SQL parameters
 */
export function extractSqlVariables(composedClauses, context) {
	return createVarsExpressionEngine(context).evaluate(
		{
			$and: composedClauses.vars,
		},
		context,
	);
}
