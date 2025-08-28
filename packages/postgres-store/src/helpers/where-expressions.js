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
			// Extract inline flags and clean pattern
			const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
			if (flagMatch) {
				const [, flags] = flagMatch;
				// Case-insensitive flag in PostgreSQL
				if (flags.includes("i")) {
					return " ~* ?";
				}
			}
			// Default case-sensitive regex (PCRE defaults)
			return " ~ ?";
		},
		vars: (operand) => {
			// Extract inline flags and clean pattern
			const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
			if (flagMatch) {
				const [, flags, pattern] = flagMatch;
				let processedPattern = pattern;

				// Handle multiline flag FIRST - PCRE 'm' flag makes ^ and $ match line boundaries  
				// PostgreSQL doesn't have direct equivalent, so we need to transform the pattern
				if (flags.includes("m")) {
					// Transform ^ to match start of line (after newline or start of string)
					processedPattern = processedPattern.replace(/\^/g, '(^|(?<=\\n))');
					// Transform $ to match end of line (before newline or end of string)  
					processedPattern = processedPattern.replace(/\$/g, '(?=\\n|$)');
				}

				// Handle dotall flag AFTER multiline - PCRE 's' flag makes . match newlines
				// We need to be explicit about . behavior when flags are present  
				if (flags.includes("s")) {
					// Make . explicitly match newlines by replacing . with [\s\S]
					processedPattern = processedPattern.replace(/\./g, '[\\s\\S]');
				} else if (processedPattern.includes('.')) {
					// If 's' flag is NOT present but pattern contains ., ensure . does NOT match newlines
					// Replace . with [^\n] to exclude newlines explicitly
					processedPattern = processedPattern.replace(/\./g, '[^\\n]');
				}

				return [processedPattern];
			}
			// No inline flags - need to handle default PostgreSQL behavior
			// PostgreSQL . might match newlines by default, so make it explicit to match PCRE behavior
			let processedPattern = operand;
			if (processedPattern.includes('.')) {
				processedPattern = processedPattern.replace(/\./g, '[^\\n]');
			}
			return [processedPattern];
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
