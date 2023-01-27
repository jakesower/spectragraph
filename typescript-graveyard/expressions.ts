import { mapValues } from "lodash-es";
import { Expression, filterDefinitions } from "../packages/core/src/definitions/filters";
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

type VarExpression<Output> = Expression<string, Output>;
type LiteralExpression<Output> = Expression<Output, Output>;

const expressionKeys = new Set([
	...Object.keys(expressionDefinitions),
	"$var",
	"$literal",
]);

type EType = typeof expressionDefinitions;

type Split<T, K extends keyof T> = K extends unknown
	? { [I in keyof T]: I extends K ? T[I] : never }
	: never;
type Explode<T> = Split<T, keyof T>;

type Moo<I, O, Exp extends Expression<I, O>> = {
	[P in keyof Exp]: I;
};

type Moo2 = {
	[K in keyof EType]: EType[K] extends Expression<infer I, any> ? I : never;
};
const moo21: Moo2 = { $eq: ["3", true] };
const moo22: Explode<Moo2> = { $eq: ["3", true] };

type Moo3 = {
	[K in keyof EType]: EType[K] extends Explode<Expression<infer I, any>> ? I : never;
};
const moo31: Moo3 = { $eq: ["3", true] };

// type Split2<T, K extends keyof T> = K extends unknown
// 	? {
// 			[I in keyof T]: I extends K
// 				? T[I] extends Expression<infer EI, any>
// 					? EI
// 					: never
// 				: never;
// 	  }
// 	: never;
// type Explode2<T> = Split2<T, keyof T>;
// const moo41: Moo4 = { $eq: ["3", true] };

type Moo5 = Explode<Partial<Moo2>>;
const moo51: Moo5 = { $eq: ["3", true] };
const moo52: Moo5 = {};
const moo53: Moo5 = { $eq: [1, 2], $gt: [2, 3] };

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];
type Moo6 = Explode<Partial<Moo2>> & AtLeastOne<Moo2>;
const moo61: Moo6 = { $eq: ["3", true] };
const moo62: Moo6 = {};
const moo63: Moo6 = { $eq: [1, 2], $gt: [2, 3] };

type ExprInput<K extends keyof EType> = EType[K] extends Expression<infer I, any>
	? I
	: never;
type ExprOutput<K extends keyof EType> = EType[K] extends Expression<any, infer O>
	? O
	: never;

type MMM<K> = K extends keyof Moo6 ? (val: ExprInput<K>) => ExprOutput<K> : never;
type MMM11 = MMM<"$eq">
type MMM12 = MMM<"$gt">
 
// declare function moof<K extends keyof EType>
// type Moo7 = Explode<Partial<ExprInput>> & AtLeastOne<ExprInput>

// declare function mooF<I, O, Exp extends Expression<I, O>, K extends keyof Exp>(input: {
// 	[K]: I;
// }): O;

// declare function mooF<K extends keyof EType>(input: {
// 	[k: K]: EType[K];
// }): O;

// declare function evalExpr<K extends keyof EType>(input: {
// 	[k: K]: EType[K];
// }): O;

type WW<X extends Expression<any, any>> = X extends Expression<infer I, any> ? I : "moo";
type WW1<K extends keyof EType> = WW<EType[K]>;

type WY<X extends Expression<any, any>> = X extends Expression<infer I, any>
	? X extends Expression<I, infer O>
		? (val: { [k: string]: I }) => O
		: never
	: never;
type WY1<K extends keyof EType> = WY<EType[K]>;

type AP<K extends keyof EType> = EType[K]["apply"];

type WR<K extends keyof EType> = EType[K] extends Expression<infer I, infer O>
	? (val: I) => O
	: never;

// type ExpressionInstance<T extends Expression<any, any>> = T extends Expression<infer I, infer O> ?
// type ExpressionInstance<T extends Expression<any, any>> = = T extends Expression<infer I, infer O> ?

// type EICheck<K extends keyof EType> = EType[K] extends Expression<infer I, infer O> ? { [K]: }

const ei1 = { $eq: ["hi", 3] };

type Expr<T> = T extends Expression<infer I, infer O> ? I : never;

// const x: Explode<EType> = { $eq: ["there", 3] };

// function fWR1<K extends keyof EType, X extends WR<K>>(val: { [K]: })
// declare function wr<K extends keyof EType>
// const wr = <K extends keyof EType>()

// declare function ap<K extends keyof EType>({ [k: ]})
type WR1 = WR<"$eq">;

const ap1: AP<"$eq"> = (x) => x[3];

const wy1: WY1<"$eq"> = (x) => true;

const ww1: WW1<"$eq"> = [5, 5];
// type VW = WW<

type VV<K extends keyof EType> = EType[K];

// type EvExprFnType<I, O, Exp extends Expression<I, O>> = I;
// type EEFT1 = EvExprFnType

type EvType<K extends keyof EType> = EType[K];

type EvType1 = EvType<"$eq">;

const mooV1 = mooF({ $eq: "there" });

const moo1 = { $eq: ["hi", 3] };

type ST = Explode<Moo>;

// type ExpArgType<Input, Output, K extends keyof EType> = { [k: string]:  }

const st: ST = { $eq: ["hi", 3] };

// type ExpressionEvaluator<EName, EInput, EOutput> = (EInput extends object) ? EInput extends { [k in keyof EType]: any }
// type YesExp<Input extends EType,  =

type Z<A, B, C> = [A, B, C];
const yesZ: Z<string, any, any> = ["hi", "there", 3];

type M<T> = T extends EType ? "Yes" : "No";

type M1 = M<number>;
type M2 = M<{ x: "y" }>;

const m3 = { $eq: [1, 2] };

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
			| "$var"
			| "$literal";

		// these expressions are always terminal
		if (expressionName === "$literal") return expression[expressionName];
		if (expressionName === "$var") return params[expression[expressionName]];

		// with evaluated children
		const args = expression[expressionName];
		const evaluatedArgs = go(args);
		return (expressionDefinitions[expressionName] as any).apply(evaluatedArgs);
	};

	return go(root);
}
