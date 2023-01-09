const $literal = {
	apply: (params) => params,
	name: "literal",
};

const $var = {
	apply: (param, vars) => vars[param],
	name: "var",
};

export const coreDefinitions = {
	$literal,
	$var,
} as const;
