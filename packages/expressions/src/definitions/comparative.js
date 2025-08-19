import { isEqual } from "lodash-es";

const $eq = {
	name: "$eq",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	schema: {
		type: "boolean",
	},
};

const $ne = {
	name: "$ne",
	apply: (operand, inputData) => !isEqual(operand, inputData),
	evaluate: ([left, right]) => !isEqual(left, right),
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

export const comparativeDefinitions = {
	$eq,
	$gt,
	$gte,
	$lt,
	$lte,
	$ne,
	$in,
	$nin,
};
