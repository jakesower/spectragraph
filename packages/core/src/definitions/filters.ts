import { isEqual } from "lodash-es";

type Ordinal = number | string;

const $eq = {
	apply: ([left, right]: [any, any]) => isEqual(left, right),
	name: "equal",
};

const $ne = {
	apply: ([left, right]: [any, any]) => !isEqual(left, right),
	name: "not equal",
};

const $gt = {
	apply: <T extends Ordinal>([left, right]: [T, T]) => left > right,
	name: "greater than",
};

const $gte = {
	apply: <T extends Ordinal>([left, right]: [T, T]) => left >= right,
	name: "greater than or equal to",
};

const $lt = {
	apply: <T extends Ordinal>([left, right]: [T, T]) => left < right,
	name: "less than",
};

const $lte = {
	apply: <T extends Ordinal>([left, right]: [T, T]) => left <= right,
	name: "less than or equal to",
};

const $in = {
	apply: <T>({ needle, haystack }: { needle: T; haystack: T[] }) =>
		haystack.includes(needle),
	name: "in",
};

const $nin = {
	apply: <T>({ needle, haystack }: { needle: T; haystack: T[] }) =>
		!haystack.includes(needle),
	name: "not in",
};

export const filterDefinitions = {
	$eq,
	$gt,
	$gte,
	$lt,
	$lte,
	$ne,
	$in,
	$nin,
} as const;
