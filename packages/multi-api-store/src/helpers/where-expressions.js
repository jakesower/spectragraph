import { mapValues, toMerged } from "es-toolkit";
import { createExpressionEngine } from "json-expressions";

const DEFAULT_HANDLERS = {
	$matchesAll: (operand, _, { apply, isExpression }) =>
		Object.entries(operand)
			.map(([attribute, expression]) =>
				isExpression(expression)
					? apply(expression, attribute)
					: apply({ $eq: expression }, attribute),
			)
			.reduce(toMerged, {}),
};

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

	return createExpressionEngine({
		includeBase: false,
		custom: definitions,
	});
}
