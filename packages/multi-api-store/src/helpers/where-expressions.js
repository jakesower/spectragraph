import { mapValues, toMerged } from "es-toolkit";

function looksLikeExpression(val) {
	return (
		val !== null &&
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		Object.keys(val)[0].startsWith("$")
	);
}

function isWrappedLiteral(val) {
	return (
		val &&
		typeof val === "object" &&
		Object.keys(val).length === 1 &&
		"$literal" in val
	);
}

const DEFAULT_HANDLERS = {
	$and: (operand, attribute, { apply }) =>
		operand.reduce((acc, pred) => ({ ...acc, ...apply(pred, attribute) }), {}),
	$matchesAll: (operand, _, { apply, isWrappedLiteral }) =>
		Object.entries(operand)
			.map(([attribute, expression]) =>
				isWrappedLiteral(expression)
					? apply({ $eq: expression.$literal }, attribute)
					: looksLikeExpression(expression)
						? apply(expression, attribute)
						: apply({ $eq: expression }, attribute),
			)
			.reduce(toMerged, {}),
	$or: (operand, attribute, { apply }) =>
		operand.length === 1 ? apply(operand[0], attribute) : {},
};

/**
 *
 * @param {Object} expressions
 * @returns {Object} an object of query parameters to be pushed down to the APIs
 *
 * This is a specialized version of the json-expressions evaluator. Its job is
 * to get an object of query parameters. It *ignores* unknown expressions rather
 * than erroring out, returning an empty query parameter object.
 */
function createExpressionWalker(expressions) {
	const isExpression = (val) =>
		looksLikeExpression(val) && Object.keys(val)[0] in expressions;

	const apply = (val, inputData) => {
		if (looksLikeExpression(val)) {
			if (isWrappedLiteral(val)) return val;

			if (isExpression(val)) {
				const expressionName = Object.keys(val)[0];
				const operand = val[expressionName];
				const expressionDef = expressions[expressionName];

				return expressionDef(operand, inputData, {
					apply,
					isExpression,
					isWrappedLiteral,
				});
			}

			return {}; // no params
		}

		return Array.isArray(val)
			? val.map((v) => apply(v, inputData))
			: val !== null && typeof val === "object"
				? mapValues(val, (v) => apply(v, inputData))
				: val;
	};

	return { apply };
}

const createTemplateExpression =
	(fn) =>
	(operand, attribute, { apply }) => {
		const resolved = apply(operand, attribute);
		return fn(attribute, resolved);
	};

export function createWherePushdownEngine(defs) {
	const definitions = {
		...DEFAULT_HANDLERS,
		...mapValues(defs, createTemplateExpression),
	};

	return createExpressionWalker(definitions);
}
