import { isEqual } from "lodash-es";
import { Operation } from "../expressions";

type FilterOperation<T> = Operation<T, T, boolean>;

const injectLeft = (param, implicit) => [implicit, param];
const injectRight = (param, implicit) => [param, implicit];

const $eq: FilterOperation<any> = {
	name: "equal",
	apply: isEqual,
	evaluate: ([left, right]) => isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $ne: FilterOperation<any> = {
	name: "not equal",
	apply: (param, input) => !isEqual(param, input),
	evaluate: ([left, right]) => !isEqual(left, right),
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gt = {
	name: "greater than",
	apply: (param, input) => input > param,
	evaluate: ([left, right]) => left > right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $gte = {
	name: "greater than or equal to",
	apply: (param, input) => input >= param,
	evaluate: ([left, right]) => left >= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lt = {
	name: "less than",
	apply: (param, input) => input < param,
	evaluate: ([left, right]) => left < right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $lte = {
	name: "less than or equal to",
	apply: (param, input) => input <= param,
	evaluate: ([left, right]) => left <= right,
	inject: injectLeft,
	schema: {
		type: "boolean",
	},
};

const $in = {
	name: "in",
	apply: (param, input) => param.includes(input),
	evaluate: (param, input) => param.includes(input),
	inject: injectRight,
	schema: {
		type: "boolean",
	},
};

const $nin = {
	name: "not in",
	apply: (param, input) => !param.includes(input),
	evaluate: (param, input) => !param.includes(input),
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
} as const;
