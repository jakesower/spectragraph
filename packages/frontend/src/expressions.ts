import { mapValues } from "lodash-es";
import { filterDefinitions } from "./definitions/filters";

export type Expression<Input, Output> = {
	apply: (params: Input) => Output;
	name: string;
};

/*

Qualities of Expressions:

- JSON serializable (so no loops, functions, etc.)
- Expected to be evaluated deeply (except when in $literal)

Thus, the expression can be walked by way of generic, deep traversal. That is,
arrays should have their values evaluated and non-expression objects should
have their values evaluated.

The goal of compilation is to produce a function that takes in variables and
returns whatever the root expression specifies.

Therefore, everything can be pre-evaluated with the exception of incoming
variables. Should no variables be encountered, an expression should return its
evaluated value as a constant. If a variable is included, it should instead
return a function that takes the (requisite) variables. If no variables are
used throughout, the root should be wrapped in a function that returns the
pre-evaluated value of the expression.

$prop and $literal are special. They are always leaf expressions.

During "target" expressions will be traversed. During "bubble" either a
constant value or function will be returned from the child. Should it be a
value, the expression should immediately use it. If it is a function, the
expression should return a function that calls the inner function as
appropriate.

Observations

- Effectively, compilation resolves anything not dependent on a variable, and,
ideally, should minimize how much code gets run. Literals will also have to be
marked as such to avoid eval.

- Evaluation should be done deeply first. Non-expression objects and arrays
need to be traversed as part of this. Each should be capable of providing
resolved arguments to ancestor expressions.

*/

export const expressionDefinitions = {
	...filterDefinitions,
};

type VarExpression = { $prop: string };
type LiteralExpression = { $literal: unknown };

const expressionKeys = new Set([
	...Object.keys(expressionDefinitions),
	"$prop",
	"$literal",
]);

function isExpression(val) {
	return (
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		expressionKeys.has(Object.keys(val)[0])
	);
}

// export function evaluate<Input, Output>(root: {[k: string]: })
export function evaluate<T>(root: T, params: object = {}) {
	const go = <Input>(val: Input) => {
		if (!isExpression(val)) {
			return Array.isArray(val)
				? val.map(go)
				: typeof val === "object"
					? mapValues(val, go)
					: val;
		}

		const expression = val as
			| typeof expressionDefinitions
			| VarExpression
			| LiteralExpression;
		const expressionName = Object.keys(expression)[0] as
			| keyof typeof expressionDefinitions
			| "$prop"
			| "$literal";

		// these expressions are always terminal
		if (expressionName === "$literal") return expression[expressionName];
		if (expressionName === "$prop") return params[expression[expressionName]];

		// with evaluated children
		const args = expression[expressionName];
		const evaluatedArgs = go(args);
		return (expressionDefinitions[expressionName] as any).apply(evaluatedArgs);
	};

	return go(root);
}
