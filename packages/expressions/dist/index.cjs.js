'use strict';

var lodashEs = require('lodash-es');

const $apply = {
	name: "$apply",
	apply: (operand) => operand,
	evaluate: (operand) => operand,
};

const $isDefined = {
	name: "$isDefined",
	apply: (_, inputData) => inputData !== undefined,
	evaluate: function(operand) {
		if (!Array.isArray(operand)) {
			throw new Error("$isDefined evaluate form requires array operand: [value]");
		}
		
		const [value] = operand;
		return value !== undefined;
	},
};

const $echo = {
	name: "$echo",
	apply: (_, inputData) => inputData,
	evaluate: function(operand) {
		if (!Array.isArray(operand)) {
			throw new Error("$echo evaluate form requires array operand: [value]");
		}
		
		const [value] = operand;
		return value;
	},
};

const $ensurePath = {
	name: "$ensurePath",
	apply: (operand, inputData) => {
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

		go(inputData, operand.split("."));
		return inputData;
	},
	evaluate: function(operand) {
		if (!Array.isArray(operand)) {
			throw new Error("$ensurePath evaluate form requires array operand: [object, path]");
		}
		
		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $get = {
	name: "$get",
	apply: (operand, inputData) => lodashEs.get(inputData, operand),
	evaluate: function(operand) {
		if (!Array.isArray(operand)) {
			throw new Error("$get evaluate form requires array operand: [object, path]");
		}
		
		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $if = {
	name: "$if",
	apply: (operand, inputData, apply, isExpression) => {
		if (
			!isExpression(operand.if) &&
			operand.if !== true &&
			operand.if !== false
		) {
			throw new Error('"if" must be an expression, true, or false');
		}

		const outcome = apply(operand.if, inputData) ? operand.then : operand.else;
		return isExpression(outcome) ? apply(outcome, inputData) : outcome;
	},
	evaluate: (operand, evaluate) => {
		const conditionResult =
			typeof operand.if === "boolean" ? operand.if : evaluate(operand.if);
		const outcome = conditionResult ? operand.then : operand.else;
		return typeof outcome === "object" && outcome !== null
			? evaluate(outcome)
			: outcome;
	},
	controlsEvaluation: true,
};

const $case = {
	name: "$case",
	apply: (operand, inputData, apply, isExpression) => {
		// Evaluate the value once
		const value = isExpression(operand.value)
			? apply(operand.value, inputData)
			: operand.value;

		// Check each case
		for (const caseItem of operand.cases) {
			let matches = false;

			// Handle both simple equality and complex expressions
			if (isExpression(caseItem.when)) {
				// For expressions that access properties from the original object (like $get),
				// we need to evaluate with the original argument.
				// For comparison expressions, we typically want to evaluate with the value.
				const whenExpressionName = Object.keys(caseItem.when)[0];
				const evaluationContext =
					whenExpressionName === "$get" ? inputData : value;
				matches = apply(caseItem.when, evaluationContext);
			} else {
				// Simple equality comparison
				matches = value === caseItem.when;
			}

			if (matches) {
				return isExpression(caseItem.then)
					? apply(caseItem.then, inputData)
					: caseItem.then;
			}
		}

		// Return default if no case matches
		return isExpression(operand.default)
			? apply(operand.default, inputData)
			: operand.default;
	},
	evaluate: (operand, evaluate) => {
		// Evaluate the value once
		const value =
			typeof operand.value === "object" && operand.value !== null
				? evaluate(operand.value)
				: operand.value;

		// Check each case
		for (const caseItem of operand.cases) {
			let matches = false;

			// Handle both simple equality and complex expressions
			if (typeof caseItem.when === "object" && caseItem.when !== null) {
				// For evaluate, we can only handle expressions that work with the value
				// (not $get which needs inputData context)
				matches = evaluate(caseItem.when) === value;
			} else {
				// Simple equality comparison
				matches = value === caseItem.when;
			}

			if (matches) {
				return typeof caseItem.then === "object" && caseItem.then !== null
					? evaluate(caseItem.then)
					: caseItem.then;
			}
		}

		// Return default if no case matches
		return typeof operand.default === "object" && operand.default !== null
			? evaluate(operand.default)
			: operand.default;
	},
	controlsEvaluation: true,
};

const $literal = {
	name: "$literal",
	apply: (operand) => operand,
	controlsEvaluation: true,
};

const $debug = {
	name: "$debug",
	apply: (_, inputData) => {
		console.log(inputData);
		return inputData;
	},
	evaluate: (operand) => {
		console.log(operand);
		return operand;
	},
};

const $compose = {
	name: "$compose",
	apply: (operand, inputData, apply, isExpression) =>
		operand.reduceRight((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: () => {
		throw new Error("$compose is not a valid expression for evaluation");
	},
	controlsEvaluation: true,
};

const $pipe = {
	name: "$pipe",
	apply: (operand, inputData, apply, isExpression) =>
		operand.reduce((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: () => {
		throw new Error("$pipe is not a valid expression for evaluation");
	},
	controlsEvaluation: true,
};

const coreDefinitions = {
	$apply,
	$case,
	$compose,
	$debug,
	$echo,
	$get,
	$if,
	$isDefined,
	$literal,
	$pipe,
	$ensurePath,
};

const $and = {
	name: "$and",
	apply: (operand, inputData, apply) =>
		operand.every((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate: (operand) => operand.every(Boolean),
	schema: {
		type: "boolean",
	},
};

const $or = {
	name: "$or",
	apply: (operand, inputData, apply) =>
		operand.some((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate: (operand) => operand.some(Boolean),
	schema: {
		type: "boolean",
	},
};

const $not = {
	name: "$not",
	apply: (operand, inputData, apply) => !apply(operand, inputData),
	controlsEvaluation: true,
	evaluate: () => {
		throw new Error("$not is not a valid expression for evaluation");
	},
	schema: { type: "boolean" },
};

const logicalDefinitions = {
	$and,
	$not,
	$or,
};

const $eq = {
	name: "$eq",
	apply: lodashEs.isEqual,
	evaluate: ([left, right]) => lodashEs.isEqual(left, right),
	schema: {
		type: "boolean",
	},
};

const $ne = {
	name: "$ne",
	apply: (operand, inputData) => !lodashEs.isEqual(operand, inputData),
	evaluate: ([left, right]) => !lodashEs.isEqual(left, right),
	schema: {
		type: "boolean",
	},
};

const $gt = {
	name: "$gt",
	apply: (operand, inputData) => inputData > operand,
	evaluate: ([left, right]) => left > right,
	schema: {
		type: "boolean",
	},
};

const $gte = {
	name: "$gte",
	apply: (operand, inputData) => inputData >= operand,
	evaluate: ([left, right]) => left >= right,
	schema: {
		type: "boolean",
	},
};

const $lt = {
	name: "$lt",
	apply: (operand, inputData) => inputData < operand,
	evaluate: ([left, right]) => left < right,
	schema: {
		type: "boolean",
	},
};

const $lte = {
	name: "$lte",
	apply: (operand, inputData) => inputData <= operand,
	evaluate: ([left, right]) => left <= right,
	schema: {
		type: "boolean",
	},
};

const $in = {
	name: "$in",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$in parameter must be an array");
		}
		return operand.includes(inputData);
	},
	evaluate: ([array, value]) => {
		if (!Array.isArray(array)) {
			throw new Error("$in parameter must be an array");
		}
		return array.includes(value);
	},
	schema: {
		type: "boolean",
	},
};

const $nin = {
	name: "$nin",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$nin parameter must be an array");
		}
		return !operand.includes(inputData);
	},
	evaluate: ([array, value]) => {
		if (!Array.isArray(array)) {
			throw new Error("$nin parameter must be an array");
		}
		return !array.includes(value);
	},
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
	name: "$count",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.length,
	schema: {
		type: "integer",
		minimum: 0,
	},
};

const $max = {
	name: "$max",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((max, v) => Math.max(max, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "$min",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};

const $sum = {
	name: "$sum",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.reduce((sum, v) => sum + v, 0),
	schema: {
		type: "number",
	},
};

const $mean = {
	name: "$mean",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((sum, v) => sum + v, 0) / operand.length,
	schema: {
		type: "number",
	},
};

const $median = {
	name: "$median",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const sorted = [...operand].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	},
	schema: {
		type: "number",
	},
};

const $mode = {
	name: "$mode",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const frequency = {};
		let maxCount = 0;
		let modes = [];

		// Count frequencies
		for (const value of operand) {
			frequency[value] = (frequency[value] ?? 0) + 1;
			if (frequency[value] > maxCount) {
				maxCount = frequency[value];
				modes = [value];
			} else if (frequency[value] === maxCount && !modes.includes(value)) {
				modes.push(value);
			}
		}

		// Return single mode if only one, array if multiple, or undefined if all values appear once
		return maxCount === 1
			? undefined
			: modes.length === 1
				? modes[0]
				: modes.sort((a, b) => a - b);
	},
	schema: {
		type: ["number", "array"],
	},
};

const aggregativeDefinitions = {
	$count,
	$max,
	$mean,
	$median,
	$min,
	$mode,
	$sum,
};

const $filter = {
	apply: (operand, inputData, apply) => inputData.filter((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate: () => {
		throw new Error("$filter is not a valid expression for evaluation");
	},
};

const $flatMap = {
	apply: (operand, inputData, apply) => inputData.flatMap((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate: () => {
		throw new Error("$flatMap is not a valid expression for evaluation");
	},
};

const $map = {
	apply: (operand, inputData, apply) => inputData.map((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate: () => {
		throw new Error("$map is not a valid expression for evaluation");
	},
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

const $random = {
	name: "$random",
	apply: (operand = {}) => {
		const { min = 0, max = 1, precision = null } = operand;
		const value = Math.random() * (max - min) + min;
		
		if (precision == null) {
			return value;
		}
		
		if (precision >= 0) {
			// Positive precision: decimal places
			return Number(value.toFixed(precision));
		} else {
			// Negative precision: round to 10^(-precision)
			const factor = Math.pow(10, -precision);
			return Math.round(value / factor) * factor;
		}
	},
	evaluate: (operand = {}) => {
		const { min = 0, max = 1, precision = null } = operand;
		const value = Math.random() * (max - min) + min;
		
		if (precision == null) {
			return value;
		}
		
		if (precision >= 0) {
			// Positive precision: decimal places
			return Number(value.toFixed(precision));
		} else {
			// Negative precision: round to 10^(-precision)
			const factor = Math.pow(10, -precision);
			return Math.round(value / factor) * factor;
		}
	},
	schema: {
		type: "number",
	},
};

const $uuid = {
	name: "$uuid",
	apply: () => crypto.randomUUID(),
	evaluate: () => crypto.randomUUID(),
	schema: {
		type: "string",
	},
};

const generativeDefinitions = {
	$random,
	$uuid,
};

const $nowLocal = {
	name: "$nowLocal",
	apply: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	evaluate: () => {
		const now = new Date();
		const offset = -now.getTimezoneOffset();
		const sign = offset >= 0 ? "+" : "-";
		const hours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0");
		const minutes = (Math.abs(offset) % 60).toString().padStart(2, "0");
		return now.toISOString().slice(0, -1) + sign + hours + ":" + minutes;
	},
	schema: {
		type: "string",
	},
};

const $nowUTC = {
	name: "$nowUTC", 
	apply: () => new Date().toISOString(),
	evaluate: () => new Date().toISOString(),
	schema: {
		type: "string",
	},
};

const $timestamp = {
	name: "$timestamp",
	apply: () => Date.now(),
	evaluate: () => Date.now(),
	schema: {
		type: "number",
	},
};

const temporalDefinitions = {
	$nowLocal,
	$nowUTC,
	$timestamp,
};

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
function createExpressionEngine(customOperations) {
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
						? lodashEs.mapValues(expression, step)
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
						? lodashEs.mapValues(expression, go)
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

const defaultExpressions = {
	...coreDefinitions,
	...logicalDefinitions,
	...comparativeDefinitions,
	...aggregativeDefinitions,
	...iterativeDefinitions,
	...generativeDefinitions,
	...temporalDefinitions,
};

const defaultExpressionEngine =
	createExpressionEngine(defaultExpressions);

exports.createExpressionEngine = createExpressionEngine;
exports.defaultExpressionEngine = defaultExpressionEngine;
exports.defaultExpressions = defaultExpressions;
