import { createExpressionEngine } from "@data-prism/core";
import { mapValues, snakeCase } from "lodash-es";

/**
 * @typedef {Object} SqlExpression
 * @property {string} name - Human readable name for the expression
 * @property {(operand: any[]) => string} where - Function to generate WHERE clause SQL
 * @property {(operand: any[]) => any} vars - Function to extract variables for SQL operand
 * @property {boolean} [controlsEvaluation] - Whether this expression controls evaluation
 */

/**
 * SQL expression definitions for building WHERE clauses and extracting variables
 * @type {Object<string, SqlExpression>}
 */
const sqlExpressions = {
	$and: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `(${operand.map(evaluate).join(" AND ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$or: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `(${operand.map(evaluate).join(" OR ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$not: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `NOT (${evaluate(operand)})`,
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$eq: {
		where: () => " = ?",
		vars: (operand) => operand,
	},
	$gt: {
		where: () => " > ?",
		vars: (operand) => operand,
	},
	$gte: {
		where: () => " >= ?",
		vars: (operand) => operand,
	},
	$lt: {
		where: () => " < ?",
		vars: (operand) => operand,
	},
	$lte: {
		where: () => " <= ?",
		vars: (operand) => operand,
	},
	$ne: {
		where: () => " != ?",
		vars: (operand) => operand,
	},
	$in: {
		where: (operand) => ` IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$nin: {
		where: (operand) => ` NOT IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$get: {
		where: (operand) => snakeCase(operand),
		vars: () => [],
	},
	$pipe: {
		where: (operand) => operand.join(" "),
		vars: (operand) => operand.flat(),
	},
	$compose: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
		vars: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
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
