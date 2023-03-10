import { get } from "lodash-es";

// Some of the functions in here are called specially. These are always
// included among definition sets, but can be overriden at the author's peril.

const $echo = {
	name: "echo",
	apply: (args) => args,
	compile: () => (val) => val,
	evaluate: (args, val) => val,
};

const $get = {
	name: "get",
	apply: (args, val) => get(val, args),
	compile: (args) => (val) => get(val, args),
	evaluate: (args, val) => get(val, args),
};

const $literal = {
	name: "literal",
	apply: (args) => args,
	compile: (args) => () => args,
	evaluate: (args) => args,
};

const $pipe = (context) => ({
	name: "pipe",
	apply: (args, val) => args.reduce((acc, expr) => context.evaluate(expr, acc), val),
	compile: (args) => (val) => args.reduce((acc, arg) => context.compile(arg)(acc), val),
	evaluate: (args, val) => args.reduce((acc, arg) => context.compile(arg)(acc), val),
});

const $prop = {
	name: "prop",
	apply: (args, val) => val[args],
	compile: (args) => (val) => val[args],
	evaluate: (args, val) => val[args],
};

const $var = {
	name: "var",
	apply: (args, val) => val[args],
	compile: (param, vars) => vars[param],
	evaluate: (args, val) => val[args],
};

export const coreDefinitions = {
	$echo,
	$get,
	$literal,
	$pipe,
	$prop,
	$var,
} as const;
