import { get } from "lodash-es";

const $apply = {
	name: "$apply",
	apply: (params) => params,
};

const $isDefined = {
	name: "$isDefined",
	apply: (_, arg) => arg !== undefined,
};

const $echo = {
	name: "$echo",
	apply: (_, arg) => arg,
};

const $ensurePath = {
	name: "$ensurePath",
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
	name: "$get",
	apply: (params, arg) => get(arg, params),
};

const $if = {
	name: "$if",
	apply: (params, arg, apply, isExpression) => {
		if (!isExpression(params.if) && params.if !== true && params.if !== false) {
			throw new Error('"if" must be an expression, true, or false');
		}

		const outcome = apply(params.if, arg) ? params.then : params.else;
		return isExpression(outcome) ? apply(outcome, arg) : outcome;
	},
	controlsEvaluation: true,
};

const $case = {
	name: "$case",
	apply: (params, arg, apply, isExpression) => {
		// Evaluate the value once
		const value = isExpression(params.value) ? apply(params.value, arg) : params.value;
		
		// Check each case
		for (const caseItem of params.cases) {
			let matches = false;
			
			// Handle both simple equality and complex expressions
			if (isExpression(caseItem.when)) {
				// For expressions that access properties from the original object (like $get),
				// we need to evaluate with the original argument.
				// For comparison expressions, we typically want to evaluate with the value.
				const whenExpressionName = Object.keys(caseItem.when)[0];
				const evaluationContext = whenExpressionName === '$get' ? arg : value;
				matches = apply(caseItem.when, evaluationContext);
			} else {
				// Simple equality comparison
				matches = value === caseItem.when;
			}
			
			if (matches) {
				return isExpression(caseItem.then) ? apply(caseItem.then, arg) : caseItem.then;
			}
		}
		
		// Return default if no case matches
		return isExpression(params.default) ? apply(params.default, arg) : params.default;
	},
	controlsEvaluation: true,
};

const $literal = {
	name: "$literal",
	apply: (params) => params,
	controlsEvaluation: true,
};

const $debug = {
	name: "$debug",
	apply: (_, arg) => {
		console.log(arg);
		return arg;
	},
};

const $compose = {
	name: "$compose",
	apply: (params, arg, apply, isExpression) =>
		params.reduceRight((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, arg),
	controlsEvaluation: true,
};

const $pipe = {
	name: "$pipe",
	apply: (params, arg, apply, isExpression) =>
		params.reduce((acc, expr) => {
			if (!isExpression(expr)) {
				throw new Error(`${JSON.stringify(expr)} is not a valid expression`);
			}

			return apply(expr, acc);
		}, arg),
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
