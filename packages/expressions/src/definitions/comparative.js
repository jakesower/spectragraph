import { isEqual } from "lodash-es";

const injectLeft = (param, implicit) => [implicit, param];
const injectRight = (param, implicit) => [param, implicit];

const $eq = {
	name: "$eq",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $ne = {
	name: "$ne",
	apply: (param, arg) => !isEqual(param, arg),
	evaluate: ([left, right]) => !isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gt = {
	name: "$gt",
	apply: (param, arg) => arg > param,
	evaluate: ([left, right]) => left > right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gte = {
	name: "$gte",
	apply: (param, arg) => arg >= param,
	evaluate: ([left, right]) => left >= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lt = {
	name: "$lt",
	apply: (param, arg) => arg < param,
	evaluate: ([left, right]) => left < right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lte = {
	name: "$lte",
	apply: (param, arg) => arg <= param,
	evaluate: ([left, right]) => left <= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $in = {
	name: "$in",
	apply: (param, arg) => {
		if (!Array.isArray(param)) {
			throw new Error("$in parameter must be an array");
		}
		return param.includes(arg);
	},
	evaluate: (param, arg) => {
		if (!Array.isArray(param)) {
			throw new Error("$in parameter must be an array");
		}
		return param.includes(arg);
	},
	inject: injectRight,
	schema: {
		type: "boolean",
	},
};

const $nin = {
	name: "$nin",
	apply: (param, arg) => {
		if (!Array.isArray(param)) {
			throw new Error("$nin parameter must be an array");
		}
		return !param.includes(arg);
	},
	evaluate: (param, arg) => {
		if (!Array.isArray(param)) {
			throw new Error("$nin parameter must be an array");
		}
		return !param.includes(arg);
	},
	inject: injectRight,
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
