const $and = {
	name: "$and",
	apply: (operand, inputData, { apply }) =>
		operand.every((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.every(Boolean);
	},
	normalizeWhere: (operand, context) => ({
		$and: operand.map(context.normalizeWhere),
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
	normalizeWhere: (operand, context) => ({
		$or: operand.map(context.normalizeWhere),
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
	normalizeWhere: (operand, context) => ({
		$not: context.normalizeWhere(operand),
	}),
};

export const logicalDefinitions = {
	$and,
	$not,
	$or,
};
