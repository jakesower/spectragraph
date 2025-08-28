import {
	createExpressionEngine,
	ExpressionNotSupportedError,
} from "@data-prism/core";
import { mapValues } from "es-toolkit";
import { DEFAULT_WHERE_EXPRESSIONS } from "../../../sql-helpers/src/where-expressions.js";

// Per-database cache for regex support detection
const regexSupportCache = new WeakMap();

/**
 * Tests if SQLite database has REGEXP function support
 * @param {import('better-sqlite3').Database} db - SQLite database instance
 * @returns {boolean} True if REGEXP is supported
 */
function hasRegexSupport(db) {
	if (regexSupportCache.has(db)) {
		return regexSupportCache.get(db);
	}

	try {
		// Test if REGEXP function exists
		db.prepare("SELECT 1 WHERE 'test' REGEXP ?").get("test");
		regexSupportCache.set(db, true);
		return true;
	} catch {
		regexSupportCache.set(db, false);
		return false;
	}
}

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
const createSQLExpressions = (db) => ({
	...DEFAULT_WHERE_EXPRESSIONS,
	$matchesRegex: {
		where: () => {
			if (!hasRegexSupport(db)) {
				throw new ExpressionNotSupportedError(
					"$matchesRegex",
					"sqlite-store",
					"SQLite regex support requires custom REGEXP function configuration",
				);
			}
			return " REGEXP ?";
		},
		vars: (operand) => {
			if (!hasRegexSupport(db)) {
				throw new ExpressionNotSupportedError(
					"$matchesRegex",
					"sqlite-store",
					"SQLite regex support requires custom REGEXP function configuration",
				);
			}
			return operand;
		},
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
});

/**
 * Expression engine for generating WHERE clause SQL
 */
export const createWhereExpressionEngine = ({ db }) =>
	createExpressionEngine(
		mapValues(createSQLExpressions(db), (expr) => ({
			...expr,
			evaluate: expr.where,
		})),
	);

/**
 * Expression engine for extracting SQL variables/parameters
 */
export const createVarsExpressionEngine = ({ db }) =>
	createExpressionEngine(
		mapValues(createSQLExpressions(db), (expr) => ({
			...expr,
			evaluate: expr.vars,
		})),
	);
