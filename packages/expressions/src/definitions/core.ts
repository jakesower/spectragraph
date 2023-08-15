import { get } from "lodash-es";

// Some of the functions in here are called specially. These are always
// included among definition sets, but can be overriden at the author's peril.

const $apply = {
	name: "apply",
	apply: (params) => params,
};

const $defined = {
	name: "defined",
	apply: (_, arg) => {
		console.log("$def", _, arg, arg !== undefined);
		// return arg == 1
		return arg !== undefined;
	},
};

const $echo = {
	name: "echo",
	apply: (_, arg) => arg,
};

const $get = {
	name: "get",
	apply: (params, arg) => get(arg, params),
};

const $literal = {
	name: "literal",
	apply: (params) => params,
};

const $pipe = (apply) => ({
	name: "pipe",
	apply: (params, arg) => params.reduce((acc, expr) => apply(expr, acc), arg),
});

const $prop = {
	name: "prop",
	apply: (params, arg) => arg[params],
};

const $var = {
	name: "var",
	apply: (params, arg) => arg[params],
};

export const coreDefinitions = {
	$apply,
	$defined,
	$echo,
	$get,
	$literal,
	$pipe,
	$prop,
	$var,
} as const;
