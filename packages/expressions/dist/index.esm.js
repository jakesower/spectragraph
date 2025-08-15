import { get, isEqual, mapValues } from 'lodash-es';

// Some of the functions in here are called specially. These are always
// included among definition sets, but can be overriden at the author's peril.

const $apply = {
	name: "apply",
	apply: (params) => params,
};

const $isDefined = {
	name: "defined",
	apply: (_, arg) => arg !== undefined,
};

const $echo = {
	name: "echo",
	apply: (_, arg) => arg,
};

const $ensurePath = {
	name: "ensure path",
	apply: (params, arg) => {
		const go = (curValue, paths, used = []) => {
			if (paths.length === 0) return;

			const [head, ...tail] = paths;
			if (!(head in curValue)) {
				throw new Error(
					`"${head}" was not found along the path ${used.join(".")}`,
				);
			}

			go(curValue[head], tail, [...used, head]);
		};

		go(arg, params.split("."));
		return arg;
	},
};

const $get = {
	name: "get",
	apply: (params, arg) => get(arg, params),
};

const $if = {
	name: "if/then/else",
	apply: (params, arg, apply, isExpression) => {
		if (!isExpression(params.if) && params.if !== true && params.if !== false)
			throw new Error('"if" must be an expression, true, or false');

		const outcome = apply(params.if, arg) ? params.then : params.else;
		return isExpression(outcome) ? apply(outcome, arg) : outcome;
	},
	controlsEvaluation: true,
};

const $literal = {
	name: "literal",
	apply: (params) => params,
	controlsEvaluation: true,
};

const $debug = {
	name: "log",
	apply: (_, arg) => {
		console.log(arg);
		return arg;
	},
};

const $compose = {
	name: "pipe",
	apply: (params, arg, apply, isExpression) =>
		params.reduce((acc, expr) => {
			if (!isExpression(expr))
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);

			return apply(expr, acc);
		}, arg),
	controlsEvaluation: true,
};

const $prop = {
	name: "prop",
	apply: (params, arg) => arg[params],
	controlsEvaluation: true,
};

const coreDefinitions = {
	$apply,
	$isDefined,
	$echo,
	$ensurePath,
	$get,
	$if,
	$literal,
	$debug,
	$compose,
	$prop,
};

const $and = {
	name: "and",
	apply: (params, arg, apply) => params.every((subexpr) => apply(subexpr, arg)),
	controlsEvaluation: true,
	evaluate: (params) => params.every(Boolean),
	schema: {
		type: "boolean",
	},
};

const $or = {
	name: "or",
	apply: (params, arg, apply) => params.some((subexpr) => apply(subexpr, arg)),
	controlsEvaluation: true,
	evaluate: (params) => params.some(Boolean),
	schema: {
		type: "boolean",
	},
};

const $not = {
	name: "not",
	apply: (subexpr, arg, apply) => !apply(subexpr, arg),
	controlsEvaluation: true,
	schema: { type: "boolean" },
};

const logicalDefinitions = {
	$and,
	$not,
	$or,
};

const injectLeft = (param, implicit) => [implicit, param];
const injectRight = (param, implicit) => [param, implicit];

const $eq = {
	name: "equal",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $ne = {
	name: "not equal",
	apply: (param, arg) => !isEqual(param, arg),
	evaluate: ([left, right]) => !isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gt = {
	name: "greater than",
	apply: (param, arg) => arg > param,
	evaluate: ([left, right]) => left > right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gte = {
	name: "greater than or equal to",
	apply: (param, arg) => arg >= param,
	evaluate: ([left, right]) => left >= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lt = {
	name: "less than",
	apply: (param, arg) => arg < param,
	evaluate: ([left, right]) => left < right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lte = {
	name: "less than or equal to",
	apply: (param, arg) => arg <= param,
	evaluate: ([left, right]) => left <= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $in = {
	name: "in",
	apply: (param, arg) => param.includes(arg),
	evaluate: (param, arg) => param.includes(arg),
	inject: injectRight,
	schema: {
		type: "boolean",
	},
};

const $nin = {
	name: "not in",
	apply: (param, arg) => !param.includes(arg),
	evaluate: (param, arg) => !param.includes(arg),
	inject: injectRight,
	schema: {
		type: "boolean",
	},
};

const comparativeDefinitions = {
	$eq,
	$gt,
	$gte,
	$lt,
	$lte,
	$ne,
	$in,
	$nin,
};

const $count = {
	name: "count",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (params) => params.length,
	schema: {
		type: "integer",
		minimum: 0,
	},
};

const $max = {
	name: "max",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (val) =>
		val.length === 0 ? undefined : val.reduce((max, v) => Math.max(max, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "min",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (val) =>
		val.length === 0 ? undefined : val.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};

const $sum = {
	name: "sum",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (params) => params.reduce((sum, v) => sum + v, 0),
	schema: {
		type: "number",
	},
};

const aggregativeDefinitions = {
	$count,
	$max,
	$min,
	$sum,
};

const $filter = {
	apply: (subexpr, arg, apply) => arg.filter((item) => apply(subexpr, item)),
	controlsEvaluation: true,
};

const $flatMap = {
	apply: (subexpr, arg, apply) => arg.flatMap((item) => apply(subexpr, item)),
	controlsEvaluation: true,
};

const $map = {
	apply: (subexpr, arg, apply) => arg.map((item) => apply(subexpr, item)),
	controlsEvaluation: true,
};

const iterativeDefinitions = {
	$filter,
	$flatMap,
	$map,
};

// apply: ([items, subexpr], arg) => {
// 	console.log(items, subexpr, arg);
// 	console.log('e', evaluate(items, arg))
// 	evaluate(items, arg).flatMap((item) => evaluate(subexpr, item))
// },

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
 * @property {function(any, function(any): any): any} [inject]
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
function createExpressionEngine(definitions) {
	const allDefinitions = { ...coreDefinitions, ...definitions }; // mutated later
	const isExpression = (val) => {
		const expressionKeys = new Set(Object.keys(allDefinitions));

		return (
			val !== null &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			Object.keys(val).length === 1 &&
			expressionKeys.has(Object.keys(val)[0])
		);
	};

	const apply = (rootExpression, arg) => {
		const step = (expression) => {
			if (!isExpression(expression)) {
				return Array.isArray(expression)
					? expression.map(step)
					: typeof expression === "object"
						? mapValues(expression, step)
						: expression;
			}

			const [expressionName, expressionParams] = Object.entries(expression)[0];
			const expressionDefinition = allDefinitions[expressionName];

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

	const evaluate = (rootExpression) => {
		const go = (expression) => {
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
			const expressionDefinition = definitions[expressionName];
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
		expressionNames: Object.keys(allDefinitions),
		compile: (expression) => {
			if (!isExpression(expression))
				throw new Error("only expressions may be compiled");

			return (arg) => apply(expression, arg);
		},
		isExpression,
	};
}

const defaultExpressions = {
	...coreDefinitions,
	...logicalDefinitions,
	...comparativeDefinitions,
	...aggregativeDefinitions,
	...iterativeDefinitions,
};

const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);

export { createExpressionEngine, defaultExpressionEngine, defaultExpressions };
