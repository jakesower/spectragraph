import { get } from "es-toolkit/compat";

const $isDefined = {
	name: "$isDefined",
	apply: (_, inputData) => inputData !== undefined,
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$isDefined evaluate form requires array operand: [value]",
			);
		}

		const [value] = operand;
		return value !== undefined;
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
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$ensurePath evaluate form requires array operand: [object, path]",
			);
		}

		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $get = {
	name: "$get",
	apply: (operand, inputData) => get(inputData, operand),
	evaluate(operand) {
		if (!Array.isArray(operand)) {
			throw new Error(
				"$get evaluate form requires array operand: [object, path]",
			);
		}

		const [object, path] = operand;
		return this.apply(path, object);
	},
};

const $literal = {
	name: "$literal",
	apply: (operand) => operand,
	evaluate: (operand) => operand,
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({ $literal: operand }),
};

const $debug = {
	name: "$debug",
	apply: (evaluatedOperand) => {
		console.log(evaluatedOperand);
		return evaluatedOperand;
	},
	evaluate(evaluatedOperand) {
		console.log(evaluatedOperand);
		return evaluatedOperand;
	},
};

const $compose = {
	name: "$compose",
	apply: (operand, inputData, { apply, isExpression }) =>
		operand.reduceRight((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: ([exprs, init], { apply }) => apply({ $compose: exprs }, init),
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$compose: operand,
	}),
};

const $pipe = {
	name: "$pipe",
	apply: (operand, inputData, { apply, isExpression }) =>
		operand.reduce((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, inputData),
	evaluate: ([exprs, init], { apply }) => apply({ $pipe: exprs }, init),
	controlsEvaluation: true,
	normalizeWhere: (operand) => ({
		$pipe: operand,
	}),
};

export const coreDefinitions = {
	$compose,
	$debug,
	$get,
	$isDefined,
	$literal,
	$pipe,
	$ensurePath,
};
