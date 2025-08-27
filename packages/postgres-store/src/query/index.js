import { mapValues } from "lodash-es";
import { extractQueryClauses } from "../parse-query.js";
import { SQL_CLAUSE_CONFIG } from "./clause-config.js";
import {
	composeSqlClauses,
	assembleSqlQuery,
	extractSqlVariables,
} from "./sql-assembly.js";
import { processQueryResults } from "./result-processing.js";

/**
 * @typedef {Object} StoreContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {import('data-prism').RootQuery} query - The root query
 * @property {any} config - Database configuration
 */

/**
 * Executes a query against PostgreSQL using a 5-step pipeline:
 * 1. Parse query into clause components
 * 2. Reduce clause arrays into single values
 * 3. Generate SQL strings and parameters
 * 4. Execute against database
 * 5. Transform results into resource graph
 *
 * @param {import('data-prism').RootQuery} query - The query to execute
 * @param {StoreContext} context - Store context with config and schema
 * @returns {Promise<any>} Query results
 */
export async function query(query, context) {
	const { config } = context;
	const { db } = config;

	// Step 1: Extract and flatten query and subqueries by clause type
	const clauseBreakdown = extractQueryClauses(query, context);

	// Step 2: Combine the flattened clauses into single values
	const initialClauses = {
		...mapValues(SQL_CLAUSE_CONFIG, (c) => c.initVal),
		from: `${config.resources[query.type].table} AS ${query.type}`,
	};
	const composedClauses = composeSqlClauses(clauseBreakdown, initialClauses);

	// Step 3: Generate the SQL and extract parameters
	const sql = assembleSqlQuery(composedClauses);
	const vars = extractSqlVariables(composedClauses);

	// Step 4: Execute the query
	const rawResults =
		(await db.query({ rowMode: "array", text: sql }, vars))?.rows ?? null;

	// Step 5: Transform raw results into final response
	return processQueryResults(rawResults, composedClauses, query, context);
}
