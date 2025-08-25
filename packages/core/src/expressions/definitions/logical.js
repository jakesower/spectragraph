const $and = {
	name: "$and",
	apply: (operand, inputData, { apply }) =>
		operand.every((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.every(Boolean);
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$and: operand.map((pred) => normalizeWhere(pred, attribute)),
	}),
};

const $or = {
	name: "$or",
	apply: (operand, inputData, { apply }) =>
		operand.some((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.some(Boolean);
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$or: operand.map((pred) => normalizeWhere(pred, attribute)),
	}),
};

const $not = {
	name: "$not",
	apply: (operand, inputData, { apply }) => !apply(operand, inputData),
	controlsEvaluation: true,
	evaluate(operand, { evaluate }) {
		const value = typeof operand === "boolean" ? operand : evaluate(operand);
		return !value;
	},
	normalizeWhere: (operand, { attribute, normalizeWhere }) => ({
		$not: normalizeWhere(operand, attribute),
	}),
};

export const logicalDefinitions = {
	$and,
	$not,
	$or,
};
