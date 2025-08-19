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
	schema: { type: "boolean" },
};

export const logicalDefinitions = {
	$and,
	$not,
	$or,
};
