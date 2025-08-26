import { mapValues, omit, snakeCase, uniq } from "lodash-es";
import { normalizeQuery, queryGraph } from "@data-prism/core";
import { varsExpressionEngine } from "./helpers/where-expressions.js";
import { parseQuery } from "./parse-query.js";
import { extractGraph } from "./extract-graph.js";
import { whereExpressionEngine } from "./helpers/where-expressions.js";

/**
 * @typedef {Object} StoreContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {import('data-prism').RootQuery} query - The root query
 * @property {any} config - Database configuration
 */

/**
 * @typedef {Object} SqlClauseHandler
 * @property {any} initVal - Initial value for the clause
 * @property {(val: any) => string} toSql - Function to convert value to SQL
 * @property {(left: any, right: any) => any} compose - Function to compose multiple values
 */

/**
 * Default clause configuration for composing arrays
 * @type {Partial<SqlClauseHandler>}
 */
const defaultClause = {
	compose: (acc, item) => uniq([...(acc ?? []), ...(item ?? [])]),
	initVal: [],
};

/**
 * SQL clause configuration for different query parts
 * @type {Object<string, SqlClauseHandler>}
 */
export const SQL_CLAUSE_CONFIG = {
	select: {
		...defaultClause,
		toSql: (val) => `SELECT ${val.map((v) => v.sql).join(", ")}`,
	},
	vars: {
		...defaultClause,
		toSql: () => "",
	},
	from: {
		initVal: null,
		compose: (_, val) => val,
		toSql: (val) => `FROM ${val}`,
	},
	join: {
		...defaultClause,
		toSql: (val) => val.join("\n"),
	},
	where: {
		...defaultClause,
		toSql: (val) =>
			val.length > 0
				? `WHERE ${whereExpressionEngine.evaluate({ $and: val })}`
				: "",
	},
	orderBy: {
		...defaultClause,
		toSql: (val) => {
			if (val.length === 0) return "";

			const orderClauses = val.map(
				({ property, direction, table }) =>
					`${table}.${snakeCase(property)}${
						direction === "desc" ? " DESC" : ""
					}`,
			);
			return `ORDER BY ${orderClauses.join(", ")}`;
		},
	},
	limit: {
		...defaultClause,
		compose: (acc, item) => Math.min(acc, item),
		initVal: Infinity,
		toSql: (val) => (val < Infinity ? `LIMIT ${val}` : ""),
	},
	offset: {
		...defaultClause,
		compose: (_, item) => item,
		initVal: 0,
		toSql: (val) => (val > 0 ? `OFFSET ${val}` : ""),
	},
};

/**
 * Replaces ? placeholders with PostgreSQL $n placeholders
 * @param {string} inputString - Input SQL string with ? placeholders
 * @returns {string} SQL string with $n placeholders
 */
export function replacePlaceholders(inputString) {
	let counter = 1;
	return inputString.replace(/\?/g, () => `$${counter++}`);
}

/**
 * Executes a query against the PostgreSQL database
 * @param {import('data-prism').RootQuery} query - The query to execute
 * @param {StoreContext} context - Store context with config and schema
 * @returns {Promise<any>} Query results
 */
export async function query(query, context) {
	const { config, schema } = context;
	const { db } = config;

	const clauseBreakdown = parseQuery(query, context);

	const initSqlClauses = {
		...mapValues(SQL_CLAUSE_CONFIG, (c) => c.initVal),
		from: `${config.resources[query.type].table} AS ${query.type}`,
	};

	const sqlClauses = clauseBreakdown.reduce(
		(acc, clause) => ({
			...acc,
			...mapValues(clause, (val, key) =>
				SQL_CLAUSE_CONFIG[key].compose(acc[key], val),
			),
		}),
		initSqlClauses,
	);

	const sql = replacePlaceholders(
		Object.entries(SQL_CLAUSE_CONFIG)
			.map(([k, v]) => v.toSql(sqlClauses[k]))
			.filter(Boolean)
			.join("\n"),
	);

	const vars = varsExpressionEngine.evaluate({
		$and: sqlClauses.vars,
	});

	const allResults =
		(await db.query({ rowMode: "array", text: sql }, vars))?.rows ?? null;

	const hasToManyJoin = Object.keys(normalizeQuery(schema, query).select).some(
		(k) =>
			schema.resources[query.type].relationships[k]?.cardinality === "many",
	);

	const handledClauses = hasToManyJoin
		? ["where"]
		: ["limit", "offset", "where"];

	const graph = extractGraph(allResults, sqlClauses.select, context);
	const strippedQuery = omit(query, handledClauses);

	return queryGraph(schema, strippedQuery, graph);
}
