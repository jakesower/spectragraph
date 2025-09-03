import { createExpressionEngine } from "json-expressions";
import { mapValues } from "es-toolkit";
import { DEFAULT_WHERE_EXPRESSIONS } from "@data-prism/sql-helpers";
import { ExpressionNotSupportedError } from "@data-prism/core";

/**
 * @typedef {Object} JsonApiExpression
 * @property {string} name - Human readable name for the expression
 * @property {(operand: any[]) => string} filter - Function to generate JSON:API filter parameter value
 * @property {boolean} [controlsEvaluation] - Whether this expression controls evaluation
 */

/**
 * JSON:API expression definitions for building filter query parameters
 * @type {Object<string, JsonApiExpression>}
 */
const jsonApiExpressions = {
	// Use all the default expressions from sql-helpers as a base
	...mapValues(DEFAULT_WHERE_EXPRESSIONS, (expr) => ({
		...expr,
		// Convert the SQL 'where' function to a JSON:API 'filter' function
		filter: expr.where
			? (operand, context) => {
					// For simple operators that work with $pipe, extract field and value
					if (context && context.pipeContext) {
						const { fieldName, operator } = context.pipeContext;
						if (operator === "$eq") {
							return { [fieldName]: operand };
						}
						if (operator === "$gt") {
							return { [`${fieldName}][$gt`]: operand };
						}
						if (operator === "$lt") {
							return { [`${fieldName}][$lt`]: operand };
						}
						if (operator === "$gte") {
							return { [`${fieldName}][$gte`]: operand };
						}
						if (operator === "$lte") {
							return { [`${fieldName}][$lte`]: operand };
						}
						if (operator === "$ne") {
							return { [`${fieldName}][$ne`]: operand };
						}
						if (operator === "$in") {
							return {
								[fieldName]: Array.isArray(operand)
									? operand.join(",")
									: operand,
							};
						}
						if (operator === "$nin") {
							return {
								[`${fieldName}][$nin`]: Array.isArray(operand)
									? operand.join(",")
									: operand,
							};
						}
					}

					// For complex expressions, delegate to the original where logic
					// but return as object structure
					return expr.where(operand, context);
				}
			: undefined,
		vars: undefined, // JSON:API doesn't use separate vars like SQL
	})),

	// Override specific expressions for JSON:API
	$pipe: {
		controlsEvaluation: true,
		filter: (operand, { evaluate }) => {
			// For $pipe operations like [$get: "field", $eq: "value"],
			// we need to extract the field name and the operation
			if (operand.length === 2) {
				const getExpr = operand[0];
				const opExpr = operand[1];

				if (getExpr?.$get && typeof getExpr.$get === "string") {
					const fieldName = getExpr.$get;

					// Handle different operators
					if (opExpr?.$eq !== undefined) {
						return { [fieldName]: opExpr.$eq };
					}
					if (opExpr?.$gt !== undefined) {
						return { [`${fieldName}][$gt`]: opExpr.$gt };
					}
					if (opExpr?.$lt !== undefined) {
						return { [`${fieldName}][$lt`]: opExpr.$lt };
					}
					if (opExpr?.$gte !== undefined) {
						return { [`${fieldName}][$gte`]: opExpr.$gte };
					}
					if (opExpr?.$lte !== undefined) {
						return { [`${fieldName}][$lte`]: opExpr.$lte };
					}
					if (opExpr?.$ne !== undefined) {
						return { [`${fieldName}][$ne`]: opExpr.$ne };
					}
					if (opExpr?.$in !== undefined) {
						return {
							[fieldName]: Array.isArray(opExpr.$in)
								? opExpr.$in.join(",")
								: opExpr.$in,
						};
					}
					if (opExpr?.$nin !== undefined) {
						return {
							[`${fieldName}][$nin`]: Array.isArray(opExpr.$nin)
								? opExpr.$nin.join(",")
								: opExpr.$nin,
						};
					}
				}
			}

			// Fallback: just evaluate each part
			return operand.map(evaluate);
		},
	},
	$and: {
		controlsEvaluation: true,
		filter: (operand, { evaluate }) => {
			// For $and operations, merge all the filter objects
			const results = operand.map(evaluate);
			return Object.assign({}, ...results);
		},
	},
	$or: {
		controlsEvaluation: true,
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$or",
				"jsonapi-store",
				"JSON:API specification does not define a standard OR filter syntax",
			);
		},
	},
	$not: {
		controlsEvaluation: true,
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$not",
				"jsonapi-store",
				"JSON:API specification does not define a standard NOT filter syntax",
			);
		},
	},
	$if: {
		controlsEvaluation: true,
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$if",
				"jsonapi-store",
				"conditional expressions are not supported in JSON:API filters",
			);
		},
	},
	$case: {
		controlsEvaluation: true,
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$case",
				"jsonapi-store",
				"case expressions are not supported in JSON:API filters",
			);
		},
	},
	$get: {
		filter: (operand) => operand, // Just return the field name
	},
	$matchesLike: {
		name: "$matchesLike",
		filter: (operand) => `like:${operand}`,
	},
	$matchesRegex: {
		name: "$matchesRegex",
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$matchesRegex",
				"jsonapi-store",
				"regex matching is not standardized in JSON:API specifications",
			);
		},
	},
	$matchesGlob: {
		name: "$matchesGlob",
		filter: () => {
			throw new ExpressionNotSupportedError(
				"$matchesGlob",
				"jsonapi-store",
				"glob matching is not standardized in JSON:API specifications",
			);
		},
	},
	$eq: {
		filter: (operand) => operand,
	},
	$gt: {
		filter: (operand) => `gt:${operand}`,
	},
	$gte: {
		filter: (operand) => `gte:${operand}`,
	},
	$lt: {
		filter: (operand) => `lt:${operand}`,
	},
	$lte: {
		filter: (operand) => `lte:${operand}`,
	},
	$ne: {
		filter: (operand) => `ne:${operand}`,
	},
	$in: {
		filter: (operand) => (Array.isArray(operand) ? operand.join(",") : operand),
	},
	$nin: {
		filter: (operand) =>
			`nin:${Array.isArray(operand) ? operand.join(",") : operand}`,
	},
};

/**
 * Expression engine for generating JSON:API filter values
 */
export const filterExpressionEngine = createExpressionEngine(
	mapValues(jsonApiExpressions, (expr) => ({ ...expr, evaluate: expr.filter })),
);

/**
 * Helper function to process filter values, handling both expressions and simple values
 * @param {any} filter - The filter value to process
 * @returns {any} The processed filter value
 */
export function processFilter(filter) {
	// If it's a simple value (not an object with $ operators), return as-is
	if (typeof filter !== "object" || filter === null || Array.isArray(filter)) {
		return filter;
	}

	// Check if it contains any expression operators
	const hasExpressionOperator = Object.keys(filter).some((key) =>
		key.startsWith("$"),
	);
	if (!hasExpressionOperator) {
		return filter;
	}

	// Process with expression engine
	return filterExpressionEngine.evaluate(filter);
}
