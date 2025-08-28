import { snakeCase, uniq } from "lodash-es";
import { createWhereExpressionEngine } from "../helpers/where-expressions.js";

/**
 * @typedef {Object} SqlClauseHandler
 * @property {any} initVal - Initial value for the clause
 * @property {(val: any) => string} toSql - Function to convert value to SQL
 * @property {(left: any, right: any) => any} compose - Function to compose multiple values
 */

// Array composition helper
const composeArrays = (acc, item) => uniq([...(acc ?? []), ...(item ?? [])]);

// Complex SQL generation functions
const generateWhereSql = (val, context) =>
	val.length > 0
		? `WHERE ${createWhereExpressionEngine(context).evaluate({ $and: val }, context)}`
		: "";

const generateOrderBySql = (val) => {
	if (val.length === 0) return "";

	const orderClauses = val.map(
		({ property, direction, table }) =>
			`${table}.${snakeCase(property)}${direction === "desc" ? " DESC" : ""}`,
	);
	return `ORDER BY ${orderClauses.join(", ")}`;
};

/**
 * SQL clause configuration for different query parts
 * @type {Object<string, SqlClauseHandler>}
 */
export const SQL_CLAUSE_CONFIG = {
	select: {
		initVal: [],
		compose: composeArrays,
		toSql: (val) => `SELECT ${val.map((v) => v.sql).join(", ")}`,
	},
	vars: {
		initVal: [],
		compose: composeArrays,
		toSql: () => "",
	},
	from: {
		initVal: null,
		compose: (_, val) => val,
		toSql: (val) => `FROM ${val}`,
	},
	join: {
		initVal: [],
		compose: composeArrays,
		toSql: (val) => val.join("\n"),
	},
	where: {
		initVal: [],
		compose: composeArrays,
		toSql: generateWhereSql,
	},
	orderBy: {
		initVal: [],
		compose: composeArrays,
		toSql: generateOrderBySql,
	},
	limit: {
		initVal: Infinity,
		compose: (acc, item) => Math.min(acc, item),
		toSql: (val) => (val < Infinity ? `LIMIT ${val}` : ""),
	},
	offset: {
		initVal: 0,
		compose: (_, item) => item,
		toSql: (val) => (val > 0 ? `OFFSET ${val}` : ""),
	},
};
