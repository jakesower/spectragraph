import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { comparativeDefinitions } from "./definitions/comparative.js";
import { aggregativeDefinitions } from "./definitions/aggregative.js";
import { iterativeDefinitions } from "./definitions/iterative.js";

export type ApplicativeExpression = object;
export type Expression = object;

export type Operation<Args, Input, Output> = {
	apply: (expression: any, arg: Input) => Output;
	applyImplicit?: (args: Args, vars: Input, implicitVar: any) => Output;
	evaluate: (params: Input) => Output;
	inject?: (args: any, inject: (v: any) => any) => any;
	name?: string;
	schema: object;
};

export type ExpressionEngine = {
	apply: (expression: Expression, arg: any) => any;
	compile: (expression: Expression) => (arg: any) => any;
	evaluate: (expression: Expression) => any;
	isExpression: (expression: Expression) => boolean;
};

export type FunctionExpression<Args, Input, Output> = (
	evaluate: (...args: any) => any,
) => Expression;

export function createExpressionEngine(definitions: object): ExpressionEngine {
	const allDefinitions = { ...coreDefinitions, ...definitions }; // mutated later
	const isExpression = (val: unknown): boolean => {
		const expressionKeys = new Set(Object.keys(allDefinitions));

		return (
			val !== null &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			Object.keys(val).length === 1 &&
			expressionKeys.has(Object.keys(val)[0])
		);
	};

	const apply = (rootExpression: Expression, arg: any) => {
		const step = <Input>(expression: Input) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(step)
					: typeof expression === "object"
					? mapValues(expression, step)
					: expression;
			}

			const [expressionName, expressionParams] = Object.entries(expression)[0];
			const expressionDefinition = allDefinitions[expressionName] as any;

			// some operations need to control the flow of evaluation
			if (expressionDefinition.controlsEvaluation) {
				return expressionDefinition.apply(
					expressionParams,
					arg,
					apply,
					isExpression,
				);
			}

			// with evaluated children
			const evaluatedParams = step(expressionParams);
			return expressionDefinition.apply(evaluatedParams, arg);
		};

		return step(rootExpression);
	};

	const evaluate = (rootExpression: Expression) => {
		const go = <Input>(expression: Input) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(go)
					: typeof expression === "object"
					? mapValues(expression, go)
					: expression;
			}

			const [expressionName, expressionArgs] = Object.entries(expression)[0];

			// these special expressions don't use evaluated arguments
			if (expressionName === "$literal") return expression[expressionName];

			// some operations need to control the flow of evaluation
			const expressionDefinition = definitions[expressionName] as any;
			if (expressionDefinition.controlsEvaluation)
				return expressionDefinition.evaluate(expressionArgs, evaluate);

			// with evaluated children
			const evaluatedArgs = go(expressionArgs);
			return expressionDefinition.evaluate(evaluatedArgs);
		};

		return go(rootExpression);
	};

	return {
		apply,
		evaluate,
		compile: (expression) => {
			if (!isExpression(expression))
				throw new Error("only expressions may be compiled");

			return (arg) => apply(expression, arg);
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
};

export const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);
