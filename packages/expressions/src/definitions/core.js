import { get } from "lodash-es";

const $apply = {
	name: "$apply",
	apply: (operand) => operand,
	evaluate: (operand) => operand,
};

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

const $echo = {
	name: "$echo",
	apply: (_, inputData) => inputData,
	evaluate(operand) {
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

const $if = {
	name: "$if",
	apply: (operand, inputData, { apply, isExpression }) => {
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
	evaluate: (operand, { evaluate }) => {
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
	apply: (operand, inputData, { apply, isExpression }) => {
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
	evaluate(operand, context) {
		const [trueOperand, value] = operand;
		return this.apply(trueOperand, value, context);
	},
	controlsEvaluation: true,
};

const $literal = {
	name: "$literal",
	apply: (operand) => operand,
	evaluate: () => {
		throw new Error("handled in expressions.js");
	},
	controlsEvaluation: true,
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
};

export const coreDefinitions = {
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
