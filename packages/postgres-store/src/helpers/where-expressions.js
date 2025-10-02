import { createExpressionEngine } from "json-expressions";
import { mapValues } from "es-toolkit";
import { DEFAULT_WHERE_EXPRESSIONS } from "../../../sql-helpers/src/where-expressions.js";

/**
 * @typedef {Object} SqlExpression
 * @property {string} name - Human readable name for the expression
 * @property {(operand: any[]) => string} where - Function to generate WHERE clause SQL
 * @property {(operand: any[]) => any} vars - Function to extract variables for SQL operand
 */

/**
 * SQL expression definitions for building WHERE clauses and extracting variables
 * @type {Object<string, SqlExpression>}
 */
const sqlExpressions = {
	...DEFAULT_WHERE_EXPRESSIONS,
	$matchesLike: {
		where: () => " LIKE ?",
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
					processedPattern = processedPattern.replace(/\^/g, "(^|(?<=\\n))");
					// Transform $ to match end of line (before newline or end of string)
					processedPattern = processedPattern.replace(/\$/g, "(?=\\n|$)");
				}

				// Handle dotall flag AFTER multiline - PCRE 's' flag makes . match newlines
				// We need to be explicit about . behavior when flags are present
				if (flags.includes("s")) {
					// Make . explicitly match newlines by replacing . with [\s\S]
					processedPattern = processedPattern.replace(/\./g, "[\\s\\S]");
				} else if (processedPattern.includes(".")) {
					// If 's' flag is NOT present but pattern contains ., ensure . does NOT match newlines
					// Replace . with [^\n] to exclude newlines explicitly
					processedPattern = processedPattern.replace(/\./g, "[^\\n]");
				}

				return [processedPattern];
			}
			// No inline flags - need to handle default PostgreSQL behavior
			// PostgreSQL . might match newlines by default, so make it explicit to match PCRE behavior
			let processedPattern = operand;
			if (processedPattern.includes(".")) {
				processedPattern = processedPattern.replace(/\./g, "[^\\n]");
			}
			return [processedPattern];
		},
	},
	$matchesGlob: {
		where: () => " ILIKE ?", // PostgreSQL case-insensitive equivalent to GLOB
		vars: (operand) => {
			// Convert GLOB pattern to PostgreSQL LIKE pattern
			let pattern = operand
				.replace(/\*/g, "%") // * becomes % (match any characters)
				.replace(/\?/g, "_"); // ? becomes _ (match any single character)
			return [pattern];
		},
	},
};

/**
 * Expression engine for generating WHERE clause SQL
 */
export const whereExpressionEngine = createExpressionEngine({
	custom: mapValues(sqlExpressions, (expr) => expr.where),
	includeBase: false,
});

/**
 * Expression engine for extracting SQL variables/parameters
 */
export const varsExpressionEngine = createExpressionEngine({
	custom: mapValues(sqlExpressions, (expr) => expr.vars),
	includeBase: false,
});
