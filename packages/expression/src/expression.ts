import { mapValues } from "lodash-es";
import { coreDefinitions } from "./definitions/core.js";
import { logicalDefinitions } from "./definitions/logical.js";

export type Expression<Args, Input, Output> = {
	apply: (args: Args, input: Input) => Output;
	compile: (args: Args) => (val: Input) => Output;
	evaluate?: (args: Args, val: Input) => Output;
	distribute?: (property: string, args: any, distribute: (v: any) => any) => any;
	distributeParams?: (args: any, distribute: (v: any) => any) => any;
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

const isExpression = (val: unknown, definitions): boolean => {
	const expressionKeys = new Set([...Object.keys(definitions ?? {}), "$var", "$literal"]);

	return (
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		expressionKeys.has(Object.keys(val)[0])
	);
};

export function evaluate<T>(expression: T, definitions, input) {
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
			return expressionArgs.reduce(
				(acc, expr) => evaluate(expr, definitions, acc),
				input,
			);
		}

		// with evaluated children
		const evaluatedArgs = go(expressionArgs);
		return (definitions[expressionName] as any).apply(evaluatedArgs, input);
	};

	return go(expression);
}

function compile(expression: object, definitions: object): (val: any) => any {
	if (!isExpression(expression, definitions)) {
		throw new Error("only expressions can be compiled");
	}

	return (val) => evaluate(expression, definitions, val);
}

function distribute(propertyExpression: { [k: string]: any }, definitions) {
	if (isExpression(propertyExpression, definitions)) {
		const [exprName, exprArgs] = Object.entries(propertyExpression)[0];
		const { distributeParams } = definitions[exprName];

		return distributeParams
			? distributeParams(exprArgs, (subExpr) => distribute(subExpr, definitions))
			: propertyExpression;
	}

	const exprs = Object.entries(propertyExpression).map(([prop, expr]) => {
		if (!isExpression(expr, definitions)) {
			return { $pipe: [{ $prop: prop }, { $eq: expr }] };
		}

		const [exprName, exprArgs] = Object.entries(expr)[0];
		const { distribute: exprDistribute } = definitions[exprName];

		return exprDistribute(prop, exprArgs, (subExpr) => distribute(subExpr, definitions));
	});

	return exprs.length > 1 ? { $and: exprs } : exprs[0];
}

export function expressionContext(expressionDefinitions: object) {
	const baseDefinitions = {
		...coreDefinitions,
		...logicalDefinitions,
		...expressionDefinitions,
	};
	const $pipe = coreDefinitions.$pipe({
		compile: (expression) => compile(expression, { ...baseDefinitions, $pipe }),
		evaluate: (expression, args) =>
			evaluate(expression, { ...baseDefinitions, $pipe }, args),
	});

	const definitions = {
		...baseDefinitions,
		$pipe,
	};

	return {
		// compile: (expression) => compile(expression, definitions),
		compile: (expression) => {
			if (!isExpression(expression, definitions)) {
				throw new Error("only expressions can be compiled");
			}
			return (vars = {}) => evaluate(expression, definitions, vars);
		},
		distribute: (propertyExpression) => distribute(propertyExpression, definitions),
		evaluate: (expression, vars = {}) => evaluate(expression, definitions, vars),
	};
}
