import { isEqual } from "lodash-es";

const createComparativeWhereCompiler =
	(exprName) =>
	(operand, context) => {
		if (!context.attribute) {
			throw new Error(`${exprName} must be nested under an attribute`);
		}
		return { $pipe: [{ $get: context.attribute }, { [exprName]: operand }] };
	};

const $eq = {
	name: "$eq",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$eq"),
};

const $ne = {
	name: "$ne",
	apply: (operand, inputData) => !isEqual(operand, inputData),
	evaluate: ([left, right]) => !isEqual(left, right),
	normalizeWhere: createComparativeWhereCompiler("$ne"),
};

const $gt = {
	name: "$gt",
	apply: (operand, inputData) => inputData > operand,
	evaluate: ([left, right]) => left > right,
	normalizeWhere: createComparativeWhereCompiler("$gt"),
};

const $gte = {
	name: "$gte",
	apply: (operand, inputData) => inputData >= operand,
	evaluate: ([left, right]) => left >= right,
	normalizeWhere: createComparativeWhereCompiler("$gte"),
};

const $lt = {
	name: "$lt",
	apply: (operand, inputData) => inputData < operand,
	evaluate: ([left, right]) => left < right,
	normalizeWhere: createComparativeWhereCompiler("$lt"),
};

const $lte = {
	name: "$lte",
	apply: (operand, inputData) => inputData <= operand,
	evaluate: ([left, right]) => left <= right,
	normalizeWhere: createComparativeWhereCompiler("$lte"),
};

const $in = {
	name: "$in",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$in parameter must be an array");
		}
		return operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$in"),
};

const $nin = {
	name: "$nin",
	apply: (operand, inputData) => {
		if (!Array.isArray(operand)) {
			throw new Error("$nin parameter must be an array");
		}
		return !operand.includes(inputData);
	},
	evaluate([array, value]) {
		return this.apply(array, value);
	},
	normalizeWhere: createComparativeWhereCompiler("$nin"),
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
