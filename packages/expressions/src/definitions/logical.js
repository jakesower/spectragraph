const $and = {
	name: "$and",
	apply: (operand, inputData, { apply }) =>
		operand.every((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.every(Boolean);
	},
};

const $or = {
	name: "$or",
	apply: (operand, inputData, { apply }) =>
		operand.some((subexpr) => apply(subexpr, inputData)),
	controlsEvaluation: true,
	evaluate(operand) {
		return operand.some(Boolean);
	},
};

const $not = {
	name: "$not",
	apply: (operand, inputData, { apply }) => !apply(operand, inputData),
	controlsEvaluation: true,
	evaluate(operand, { evaluate }) {
		const value = typeof operand === "boolean" ? operand : evaluate(operand);
		return !value;
	},
};

export const logicalDefinitions = {
	$and,
	$not,
	$or,
};
