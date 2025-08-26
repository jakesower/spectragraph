import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { aggregativeDefinitions } from "./definitions/aggregative.js";
import { comparativeDefinitions } from "./definitions/comparative.js";
import { conditionalDefinitions } from "./definitions/conditional.js";
import { generativeDefinitions } from "./definitions/generative.js";
import { iterativeDefinitions } from "./definitions/iterative.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { temporalDefinitions } from "./definitions/temporal.js";
import { mathDefinitions } from "./definitions/math.js";

/**
 * @typedef {object} ApplicativeExpression
 */

/**
 * @typedef {object} Expression
 */

/**
 * @typedef {object} WhereClause
 */

/**
 * @template Args, Input, Output
 * @typedef {object} Expression
 * @property {function(any, Input): Output} apply
 * @property {function(Args, Input, any): Output} [applyImplicit]
 * @property {function(Input): Output} evaluate
 * @property {string} [name]
 * @property {object} schema
 */

/**
 * @typedef {object} ExpressionEngine
 * @property {function(Expression, any): any} apply
 * @property {function(Expression): any} evaluate
 * @property {string[]} expressionNames
 * @property {function(Expression): boolean} isExpression
 * @property {function(WhereClause): Expression} normalizeWhereClause
 */

/**
 * @template Args, Input, Output
 * @typedef {function(...any): Expression} FunctionExpression
 */

/**
 * @param {object} definitions
 * @returns {ExpressionEngine}
 */
export function createExpressionEngine(customExpressions) {
	const expressions = { ...coreDefinitions, ...customExpressions }; // mutated later
	const isExpression = (val) => {
		const expressionKeys = new Set(Object.keys(expressions));

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
			const expressionDef = expressions[expressionName];

			if (expressionDef.controlsEvaluation) {
				return expressionDef.apply(operand, inputData, { apply, isExpression });
			}

			const evaluatedOperand = step(operand);
			return expressionDef.apply(evaluatedOperand, inputData);
		};

		return step(rootExpression);
	};

	const evaluate = (expression) => {
		if (!isExpression(expression)) {
			return Array.isArray(expression)
				? expression.map(evaluate)
				: typeof expression === "object"
					? mapValues(expression, evaluate)
					: expression;
		}

		const [expressionName, operand] = Object.entries(expression)[0];

		// special case
		if (expressionName === "$literal") return expression[expressionName];

		const expressionDef = expressions[expressionName];
		if (expressionDef.controlsEvaluation) {
			return expressionDef.evaluate(operand, {
				apply,
				evaluate,
				isExpression,
			});
		}

		const evaluatedOperand = evaluate(operand);
		return expressionDef.evaluate(evaluatedOperand);
	};

	const normalizeWhereClause = (where) => {
		const compileNode = (node, attribute) => {
			if (Array.isArray(node)) {
				throw new Error("Array found in where clause. Where clauses must be objects or expressions that test conditions.");
			}

			if (typeof node === "object") {
				if (isExpression(node)) {
					const [expressionName, operand] = Object.entries(node)[0];
					const expression = expressions[expressionName];

					if (!("normalizeWhere" in expression)) {
						throw new Error(`Expression ${expressionName} cannot be used in where clauses. Where clauses require expressions that test conditions (comparisons like $eq, $gt or logical operators like $and, $or).`);
					}

					return expression.normalizeWhere(operand, {
						attribute,
						normalizeWhere: compileNode,
					});
				}

				// not an expression
				return Object.entries(node).length === 1
					? compileNode(Object.entries(node)[0][1], Object.entries(node)[0][0])
					: {
							$and: Object.entries(node).map(([attr, value]) =>
								compileNode(value, attr),
							),
						};
			}

			return { $pipe: [{ $get: attribute }, { $eq: node }] };
		};

		return compileNode(where, null);
	};

	return {
		apply,
		evaluate,
		expressionNames: Object.keys(expressions),
		isExpression,
		normalizeWhereClause,
	};
}

export const defaultExpressions = {
	...coreDefinitions,
	...aggregativeDefinitions,
	...comparativeDefinitions,
	...conditionalDefinitions,
	...generativeDefinitions,
	...iterativeDefinitions,
	...logicalDefinitions,
	...mathDefinitions,
	...temporalDefinitions,
};

export const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);
