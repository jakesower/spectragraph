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
	apply: (val) =>
		val.length === 0 ? undefined : val.reduce((min, v) => Math.max(min, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "min",
	apply: (val) =>
		val.length === 0 ? undefined : val.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};

const $sum = {
	name: "min",
	apply: (val) => val.reduce((sum, v) => sum + v, 0),
	schema: {
		type: "number",
	},
};

export const mathDefinitions = {
	$count,
	$max,
	$min,
	$sum,
};
