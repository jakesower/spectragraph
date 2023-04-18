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
};

const $ne: FilterExpression<any> = {
	name: "not equal",
	apply: (param, input) => !isEqual(param, input),
	distribute: makeDistribute("$ne"),
};

const $gt = {
	name: "greater than",
	apply: (param, input) => input > param,
	distribute: makeDistribute("$gt"),
};

const $gte = {
	name: "greater than or equal to",
	apply: (param, input) => input >= param,
	distribute: makeDistribute("$gte"),
};

const $lt = {
	name: "less than",
	apply: (param, input) => input < param,
	distribute: makeDistribute("$lt"),
};

const $lte = {
	name: "less than or equal to",
	apply: (param, input) => input <= param,
	distribute: makeDistribute("$lte"),
};

const $in = {
	name: "in",
	apply: (param, input) => param.includes(input),
	distribute: makeDistribute("$in"),
};

const $nin = {
	name: "not in",
	apply: (param, input) => !param.includes(input),
	distribute: makeDistribute("$nin"),
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
