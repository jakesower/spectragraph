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
	apply: (args, input) => get(input, args),
};

const $literal = {
	name: "literal",
	apply: (args) => args,
};

const $pipe = (evaluate) => ({
	name: "pipe",
	apply: (args, input) => args.reduce((acc, expr) => evaluate(expr, acc), input),
});

const $prop = {
	name: "prop",
	apply: (args, input) => input[args],
};

const $var = {
	name: "var",
	apply: (args, input) => input[args],
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
