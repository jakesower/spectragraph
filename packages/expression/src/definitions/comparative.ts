import { isEqual } from "lodash-es";
import { Expression } from "../expression";

type FilterExpression<T> = Expression<T, T, boolean>;

const makeDistribute = (operationName) => (prop, args) => ({
	$pipe: [{ $prop: prop }, { [operationName]: args }],
});

const $eq: FilterExpression<any> = {
	name: "equal",
	apply: isEqual,
	distribute: makeDistribute("$eq"),
	schema: {
		type: "boolean",
	},
};

const $ne: FilterExpression<any> = {
	name: "not equal",
	apply: (param, input) => !isEqual(param, input),
	distribute: makeDistribute("$ne"),
	schema: {
		type: "boolean",
	},
};

const $gt = {
	name: "greater than",
	apply: (param, input) => input > param,
	distribute: makeDistribute("$gt"),
	schema: {
		type: "boolean",
	},
};

const $gte = {
	name: "greater than or equal to",
	apply: (param, input) => input >= param,
	distribute: makeDistribute("$gte"),
	schema: {
		type: "boolean",
	},
};

const $lt = {
	name: "less than",
	apply: (param, input) => input < param,
	distribute: makeDistribute("$lt"),
	schema: {
		type: "boolean",
	},
};

const $lte = {
	name: "less than or equal to",
	apply: (param, input) => input <= param,
	distribute: makeDistribute("$lte"),
	schema: {
		type: "boolean",
	},
};

const $in = {
	name: "in",
	apply: (param, input) => param.includes(input),
	distribute: makeDistribute("$in"),
	schema: {
		type: "boolean",
	},
};

const $nin = {
	name: "not in",
	apply: (param, input) => !param.includes(input),
	distribute: makeDistribute("$nin"),
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
