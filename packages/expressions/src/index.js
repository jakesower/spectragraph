import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { comparativeDefinitions } from "./definitions/comparative.js";
import { aggregativeDefinitions } from "./definitions/aggregative.js";
import { iterativeDefinitions } from "./definitions/iterative.js";
import { generativeDefinitions } from "./definitions/generative.js";
import { temporalDefinitions } from "./definitions/temporal.js";

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
