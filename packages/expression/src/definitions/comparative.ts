import { isEqual } from "lodash-es";
import { Expression } from "../expression";

type Ordinal = number | string;

type FilterExpression<T> = Expression<T, T, boolean>;

const makeDistribute = (fn) => (prop, args) => ({
	$pipe: [{ $prop: prop }, { [fn]: args }],
});

const $eq: FilterExpression<any> = {
	name: "equal",
	apply: isEqual,
	compile: (args) => (val) => isEqual(args, val),
	distribute: makeDistribute("$eq"),
	evaluate: ([left, right]) => isEqual(left, right),
};

const $ne: FilterExpression<any> = {
	name: "not equal",
	apply: (param, input) => !isEqual(param, input),
	compile: (args) => (val) => !isEqual(args, val),
	distribute: makeDistribute("$ne"),
	evaluate: <T extends Ordinal>([left, right]: [T, T]) => !isEqual(left, right),
};

const $gt = {
	name: "greater than",
	apply: (param, input) => input > param,
	compile: (args) => (val) => val > args,
	distribute: makeDistribute("$gt"),
	evaluate: <T extends Ordinal>([left, right]: [T, T]) => left > right,
};

const $gte = {
	name: "greater than or equal to",
	apply: (param, input) => input >= param,
	compile: (args) => (val) => val >= args,
	distribute: makeDistribute("$gte"),
	evaluate: <T extends Ordinal>([left, right]: [T, T]) => left >= right,
};

const $lt = {
	name: "less than",
	apply: (param, input) => input < param,
	compile: (args) => (val) => val < args,
	distribute: makeDistribute("$lt"),
	evaluate: <T extends Ordinal>([left, right]: [T, T]) => left < right,
};

const $lte = {
	apply: (param, input) => input <= param,
	name: "less than or equal to",
	compile: (args) => (val) => val <= args,
	distribute: makeDistribute("$lte"),
	evaluate: <T extends Ordinal>([left, right]: [T, T]) => left <= right,
};

const $in = {
	name: "in",
	apply: (param, input) => param.includes(input),
	compile: (args) => (val) => args.includes(val),
	distribute: makeDistribute("$in"),
	evaluate: <T>({ needle, haystack }: { needle: T; haystack: T[] }) =>
		haystack.includes(needle),
};

const $nin = {
	name: "not in",
	apply: (param, input) => !param.includes(input),
	compile: (args) => (val) => !args.includes(val),
	distribute: makeDistribute("$nin"),
	evaluate: <T>({ needle, haystack }: { needle: T; haystack: T[] }) =>
		!haystack.includes(needle),
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
