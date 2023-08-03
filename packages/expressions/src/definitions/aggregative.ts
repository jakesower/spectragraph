const $count = {
	name: "count",
	apply: (val) => val.length,
	schema: {
		type: "integer",
		minimum: 0,
	},
};

const $max = {
	name: "max",
	apply: (val) => val.reduce((min, v) => Math.max(min, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "min",
	apply: (val) => val.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};
export const aggregativeDefinitions = {
	$count,
	$max,
	$min,
};
