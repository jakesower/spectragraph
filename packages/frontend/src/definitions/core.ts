const $literal = {
	apply: (params) => params,
	name: "literal",
};

const $prop = {
	apply: (param, vars) => vars[param],
	name: "var",
};

export const coreDefinitions = {
	$literal,
	$prop,
} as const;
