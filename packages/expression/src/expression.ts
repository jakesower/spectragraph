import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { comparativeDefinitions } from "./definitions/comparative.js";

export type Expression<Args, Input, Output> = {
	apply: (args: Args, input: Input) => Output;
	distribute?: (args: any, distribute: (v: any) => any) => any;
	name: string;
};

export type FunctionExpression<Args, Input, Output> = (
	evaluate: (...args: any) => any,
) => Expression<Args, Input, Output>;

export function isExpression(val: unknown, definitions): boolean {
	const expressionKeys = new Set([...Object.keys(definitions ?? {}), "$var", "$literal"]);

	return (
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		expressionKeys.has(Object.keys(val)[0])
	);
}

export function createExpressionEngine(expressionDefinitions: object) {
	const definitions = { ...coreDefinitions, ...expressionDefinitions };

	function evaluate<T>(expression: T, input) {
		const go = <Input>(expr: Input) => {
			if (!isExpression(expr, definitions)) {
				return Array.isArray(expr)
					? expr.map(go)
					: typeof expr === "object"
						? mapValues(expr, go)
						: expr;
			}

			const [expressionName, expressionArgs] = Object.entries(expr)[0];

			// these special expressions don't use evaluated arguments
			if (expressionName === "$literal") return expr[expressionName];
			if (expressionName === "$var") return input[expr[expressionName]];
			if (expressionName === "$pipe") {
				return expressionArgs.reduce((acc, expr) => evaluate(expr, acc), input);
			}

			// with evaluated children
			const evaluatedArgs = go(expressionArgs);
			return (definitions[expressionName] as any).apply(evaluatedArgs, input);
		};

		return go(expression);
	}

	Object.keys(definitions).forEach((defKey) => {
		if (typeof definitions[defKey] === "function") {
			definitions[defKey] = definitions[defKey](evaluate);
		}
	});

	return {
		compile(expression) {
			if (!isExpression(expression, definitions)) {
				throw new Error("only expressions can be compiled");
			}

			return (vars = {}) => evaluate(expression, vars);
		},
		evaluate(expression, vars = {}) {
			if (!isExpression(expression, definitions)) {
				throw new Error("only expressions can be compiled");
			}

			return evaluate(expression, vars);
		},
	};
}
