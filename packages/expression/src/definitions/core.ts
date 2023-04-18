import { get } from "lodash-es";

// Some of the functions in here are called specially. These are always
// included among definition sets, but can be overriden at the author's peril.

const $echo = {
	name: "echo",
	apply: (args) => args,
};

const $input = {
	name: "input",
	apply: (_, input) => input,
};

const $get = {
	name: "get",
	apply: (args, val) => get(val, args),
};

const $literal = {
	name: "literal",
	apply: (args) => args,
};

const $pipe = (evaluate) => ({
	name: "pipe",
	apply: (args, val) => args.reduce((acc, expr) => evaluate(expr, acc), val),
});

const $prop = {
	name: "prop",
	apply: (args, val) => val[args],
};

const $var = {
	name: "var",
	apply: (args, val) => val[args],
};

export const coreDefinitions = {
	$echo,
	$get,
	$input,
	$literal,
	$pipe,
	$prop,
	$var,
} as const;
