import { createExpressionEngine, ExpressionNotSupportedError } from "@data-prism/core";
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
		where: (operand, { evaluate }) =>
			`(${operand.map(evaluate).join(" AND ")})`,
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
	$matchesRegex: {
		where: (operand) => {
			throw new ExpressionNotSupportedError(
				"$matchesRegex", 
				"sqlite-store", 
				"SQLite regex support requires custom REGEXP function configuration"
			);
		},
		vars: (operand) => {
			throw new ExpressionNotSupportedError(
				"$matchesRegex", 
				"sqlite-store", 
				"SQLite regex support requires custom REGEXP function configuration"
			);
		},
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
	$literal: {
		where: (operand) => String(operand),
		vars: () => [],
		controlsEvaluation: true,
	},
	$if: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const condition = evaluate(operand.if);
			const thenClause = isExpression(operand.then)
				? evaluate(operand.then)
				: "?";
			const elseClause = isExpression(operand.else)
				? evaluate(operand.else)
				: "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const ifResult = evaluate(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = evaluate(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = evaluate(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
	$case: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const value = isExpression(operand.value) ? evaluate(operand.value) : "?";
			let sql = `CASE ${value}`;

			for (const caseItem of operand.cases) {
				const whenClause = isExpression(caseItem.when)
					? evaluate(caseItem.when)
					: "?";
				const thenClause = isExpression(caseItem.then)
					? evaluate(caseItem.then)
					: "?";
				sql += ` WHEN ${whenClause} THEN ${thenClause}`;
			}

			const defaultClause = isExpression(operand.default)
				? evaluate(operand.default)
				: "?";
			sql += ` ELSE ${defaultClause} END`;

			return sql;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const vars = [];

			if (isExpression(operand.value)) {
				vars.push(...evaluate(operand.value));
			} else {
				vars.push(operand.value);
			}

			for (const caseItem of operand.cases) {
				if (isExpression(caseItem.when)) {
					vars.push(...evaluate(caseItem.when));
				} else {
					vars.push(caseItem.when);
				}
				if (isExpression(caseItem.then)) {
					vars.push(...evaluate(caseItem.then));
				} else {
					vars.push(caseItem.then);
				}
			}

			if (isExpression(operand.default)) {
				vars.push(...evaluate(operand.default));
			} else {
				vars.push(operand.default);
			}

			return vars.flat();
		},
	},
	$debug: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate(operand),
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$matchesLike: {
		name: "$matchesLike",
		where: () => " LIKE ?",
		vars: (operand) => operand,
	},
	$matchesGlob: {
		name: "$matchesGlob",
		where: () => " GLOB ?",
		vars: (operand) => operand,
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
