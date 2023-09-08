import { get } from "lodash-es";

// Some of the functions in here are called specially. These are always
// included among definition sets, but can be overriden at the author's peril.

const $apply = {
	name: "apply",
	apply: (params) => params,
};

const $defined = {
	name: "defined",
	apply: (_, arg) => arg !== undefined,
};

const $echo = {
	name: "echo",
	apply: (_, arg) => arg,
};

const $get = {
	name: "get",
	apply: (params, arg) => get(arg, params),
	controlsEvaluation: true,
};

const $literal = {
	name: "literal",
	apply: (params) => params,
	controlsEvaluation: true,
};

const $pipe = {
	name: "pipe",
	apply: (params, arg, apply) => params.reduce((acc, expr) => apply(expr, acc), arg),
	controlsEvaluation: true,
};

const $prop = {
	name: "prop",
	apply: (params, arg) => arg[params],
	controlsEvaluation: true,
};

export const coreDefinitions = {
	$apply,
	$defined,
	$echo,
	$get,
	$literal,
	$pipe,
	$prop,
} as const;
