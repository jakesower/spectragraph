import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { comparativeDefinitions } from "./definitions/comparative.js";
import { aggregativeDefinitions } from "./definitions/aggregative.js";
import { iterativeDefinitions } from "./definitions/iterative.js";
import { generativeDefinitions } from "./definitions/generative.js";
import { temporalDefinitions } from "./definitions/temporal.js";

/**
 * Error thrown when an expression cannot be evaluated without input data context
 */
export class NoEvaluationAllowedError extends Error {
	constructor(expressionName) {
		super(
			`${expressionName} expressions cannot be evaluated without input data context`,
		);
		this.name = "NoEvaluationAllowedError";
	}
}

/**
 * @typedef {object} ApplicativeExpression
 */

/**
 * @typedef {object} Expression
 */

/**
 * @template Args, Input, Output
 * @typedef {object} Operation
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {string} [name]
 * @property {object} schema
 */

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): function(any): any} compile
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 */

/**
 * @template Args, Input, Output
 * @typedef {function(...any): Expression} FunctionExpression
 */

/**
 * @param {object} definitions
 * @returns {ExpressionEngine}
 */
export function createExpressionEngine(customOperations) {
	const operations = { ...coreDefinitions, ...customOperations }; // mutated later
	const isExpression = (val) => {
		const expressionKeys = new Set(Object.keys(operations));

		return (
			val !== null &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			Object.keys(val).length === 1 &&
			expressionKeys.has(Object.keys(val)[0])
		);
	};

	const apply = (rootExpression, inputData) => {
		const step = (expression) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(step)
					: typeof expression === "object"
						? mapValues(expression, step)
						: expression;
			}

			const [expressionName, operand] = Object.entries(expression)[0];
			const operation = operations[expressionName];

			if (operation.controlsEvaluation) {
				return operation.apply(operand, inputData, apply, isExpression);
			}

			const evaluatedOperand = step(operand);
			return operation.apply(evaluatedOperand, inputData);
		};

		return step(rootExpression);
	};

	const evaluate = (rootExpression) => {
		const go = (expression) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(go)
					: typeof expression === "object"
						? mapValues(expression, go)
						: expression;
			}

			const [expressionName, operand] = Object.entries(expression)[0];

			// special case
			if (expressionName === "$literal") return expression[expressionName];

			const operation = operations[expressionName];
			if (operation.controlsEvaluation) {
				return operation.evaluate(operand, evaluate);
			}

			const evaluatedOperand = go(operand);
			return operation.evaluate(evaluatedOperand);
		};

		return go(rootExpression);
	};

	return {
		apply,
		evaluate,
		expressionNames: Object.keys(operations),
		compile: (expression) => {
			if (!isExpression(expression)) {
				throw new Error("only expressions may be compiled");
			}

			return (inputData) => apply(expression, inputData);
		},
		isExpression,
	};
}

export const defaultExpressions = {
	...coreDefinitions,
	...logicalDefinitions,
	...comparativeDefinitions,
	...aggregativeDefinitions,
	...iterativeDefinitions,
	...generativeDefinitions,
	...temporalDefinitions,
};

export const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);

/**
 * Checks if an expression can be evaluated without input data context
 * @param {Expression} expression - The expression to check
 * @param {object} operations - The operations object (defaults to defaultExpressions)
 * @returns {boolean} - True if the expression can be evaluated statically
 */
export function isEvaluable(expression, operations = defaultExpressions) {
	const checkExpression = (expr) => {
		if (!defaultExpressionEngine.isExpression(expr)) {
			return Array.isArray(expr)
				? expr.every(checkExpression)
				: typeof expr === "object" && expr !== null
					? Object.values(expr).every(checkExpression)
					: true;
		}

		const [name, operand] = Object.entries(expr)[0];
		const operation = operations[name];

		// Special case: $literal is always evaluable (handled specially in evaluate())
		if (name === "$literal") return true;

		// If operation doesn't exist or has no evaluate function, it's not evaluable
		if (!operation || !operation.evaluate) return false;

		// Try to actually evaluate to see if it throws NoEvaluationAllowedError
		try {
			// First try a quick evaluation to see if this operation itself throws
			operation.evaluate(operand, () => null); // Pass dummy evaluate function
		} catch (e) {
			if (e instanceof NoEvaluationAllowedError) {
				return false;
			}
			// Other errors, continue checking
		}

		return checkExpression(operand);
	};

	return checkExpression(expression);
}
