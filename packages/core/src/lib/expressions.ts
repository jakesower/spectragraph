import { mapValues } from "lodash-es";
import { filterDefinitions } from "../definitions/filters";
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

$var and $literal are special. They are always leaf expressions.

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

type VarExpression = {
	$var: string;
};

type LiteralExpression = {
	$literal: unknown;
};

const expressionKeys = new Set([
	...Object.keys(expressionDefinitions),
	"$var",
	"$literal",
]);

// type Expression<Params, Return> = {
// 	name?: string;
// 	apply: (params: Params) => Return;
// };

type Expression = typeof expressionDefinitions;

function isExpression(val: unknown) {
	return (
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		expressionKeys.has(Object.keys(val)[0])
	);
}

export function evaluate(root: unknown, vars: object = {}) {
	const go = (val: unknown) => {
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
			| "$var"
			| "$literal";
		const args = expression[expressionName];

		// these expressions are always terminal
		if (expressionName === "$literal") return args;
		if (expressionName === "$var") return vars[args];

		// with evaluated children
		const evaluatedArgs = go(args);
		return expressionDefinitions[expressionName].apply(evaluatedArgs);
	};

	return go(root);
}

// export function compileExpression(expression, operators, context) {
// 	const compile = (subExpression) => {

// 		const looksLikeExpression =
// 			typeof subExpression === "object" && !Array.isArray(subExpression);

// 		if (!looksLikeExpression) return () => subExpression;

// 		if (!isValidExpression(subExpression, operators)) {
// 			throw new Error(
// 				"objects passed as expressions must contain a single, valid expression; check the operators or wrap the object in $literal",
// 			);
// 		}

// 		const [operation, args] = Object.entries(subExpression)[0];
// 		const operator = operators[operation];

// 		return operator.compile(args, compile, context);
// 	};

// 	return compile(expression);
// }

// export function evaluateExpression(expression, operators, variables) {
// 	return compileExpression(expression, operators)(variables);
// }
