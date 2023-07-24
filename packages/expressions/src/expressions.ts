import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";
import { comparativeDefinitions } from "./definitions/comparative.js";
import { distribute } from "./distribute.js";
import { mathDefinitions } from "./definitions/math.js";
import { iterativeDefinitions } from "./definitions/iterative.js";

export type Expression<Args, Input, Output> = {
	apply: (args: Args, input: Input) => Output;
	distribute?: (args: any, distribute: (v: any) => any) => any;
	name?: string;
	schema: object;
};

export type FunctionExpression<Args, Input, Output> = (
	evaluate: (...args: any) => any,
) => Expression<Args, Input, Output>;

const CONTROLS_EVALUATION = Symbol("contols evaluation");

export function isExpression(val: unknown, definitions): boolean {
	const expressionKeys = new Set([...Object.keys(definitions ?? {}), "$var", "$literal"]);

	return (
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		expressionKeys.has(Object.keys(val)[0])
	);
}

export function createExpressionEngine(definitions) {
	function evaluate<T>(rootExpression: T, input) {
		const go = <Input>(expression: Input) => {
			if (!isExpression(expression, definitions)) {
				return Array.isArray(expression)
					? expression.map(go)
					: typeof expression === "object"
						? mapValues(expression, go)
						: expression;
			}

			const [expressionName, expressionArgs] = Object.entries(expression)[0];

			// these special expressions don't use evaluated arguments
			if (expressionName === "$literal") return expression[expressionName];
			if (expressionName === "$var") return input[expression[expressionName]];

			// some operations need to control the flow of evaluation
			const expressionDefinition = definitions[expressionName] as any;
			if (expressionDefinition[CONTROLS_EVALUATION]) {
				return expressionDefinition.apply(expressionArgs, input);
			}

			// with evaluated children
			const evaluatedArgs = go(expressionArgs);
			return expressionDefinition.apply(evaluatedArgs, input);
		};

		return go(rootExpression);
	}

	Object.keys(definitions).forEach((defKey) => {
		const controlsEvaluation = typeof definitions[defKey] === "function";
		if (controlsEvaluation) {
			definitions[defKey] = definitions[defKey](evaluate);
		}

		definitions[defKey][CONTROLS_EVALUATION] = controlsEvaluation;
	});

	return {
		compile(expression) {
			if (!isExpression(expression, definitions)) {
				throw new Error("only expressions can be compiled");
			}

			return (input?: any) => evaluate(expression, input);
		},
		distribute(expression) {
			return distribute(expression, definitions);
		},
		evaluate(expression, input?: any) {
			if (!isExpression(expression, definitions)) {
				throw new Error("only expressions can be compiled");
			}

			return evaluate(expression, input);
		},
		isExpression(expression) {
			return isExpression(expression, definitions);
		},
	};
}

export function createDefaultExpressionEngine() {
	return createExpressionEngine({
		...coreDefinitions,
		...logicalDefinitions,
		...comparativeDefinitions,
		...mathDefinitions,
		...iterativeDefinitions,
	});
}
