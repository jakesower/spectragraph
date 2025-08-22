import { createExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

/**
 * @typedef {Object} SqlExpression
 * @property {string} name - Human readable name for the expression
 * @property {(params: any[]) => string} where - Function to generate WHERE clause SQL
 * @property {(params: any[]) => any} vars - Function to extract variables for SQL params
 * @property {boolean} [controlsEvaluation] - Whether this expression controls evaluation
 */

/**
 * SQL expression definitions for building WHERE clauses and extracting variables
 * @type {Object<string, SqlExpression>}
 */
const sqlExpressions = {
	$and: {
		name: "and",
		where: (params) => params.join(" AND "),
		vars: (params) => params.flat(),
	},
	$eq: {
		name: "equal",
		where: (params) => `${params[0]} = ?`,
		vars: (params) => params[1],
	},
	$gt: {
		name: "greater than",
		where: (params) => `${params[0]} > ?`,
		vars: (params) => params[1],
	},
	$gte: {
		name: "greater than or equal to",
		where: (params) => `${params[0]} >= ?`,
		vars: (params) => params[1],
	},
	$lt: {
		name: "less than",
		where: (params) => `${params[0]} < ?`,
		vars: (params) => params[1],
	},
	$lte: {
		name: "less than or equal to",
		where: (params) => `${params[0]} <= ?`,
		vars: (params) => params[1],
	},
	$ne: {
		name: "not equal",
		where: (params) => `${params[0]} != ?`,
		vars: (params) => params[1],
	},
	$in: {
		name: "contained in",
		where: (params) =>
			`${params[0]} IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
	$nin: {
		name: "not contained in",
		where: (params) =>
			`${params[0]} NOT IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
	$or: {
		// TODO
		name: "or",
		controlsEvaluation: true,
		where: (params, evaluate) => {
			console.log("args", params.map(evaluate));
		},
		vars: (...args) => {
			console.log("Var args", args);
		},
	},
};

/**
 * Expression engine for generating WHERE clause SQL
 */
export const whereExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.where })),
);

/**
 * Expression engine for extracting SQL variables/parameters
 */
export const varsExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.vars })),
);