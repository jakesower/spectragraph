const $count = {
	name: "count",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (params) => params.length,
	schema: {
		type: "integer",
		minimum: 0,
	},
};

const $max = {
	name: "max",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (val) =>
		val.length === 0 ? undefined : val.reduce((max, v) => Math.max(max, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "min",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (val) =>
		val.length === 0 ? undefined : val.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};

const $sum = {
	name: "sum",
	apply(params) {
		return this.evaluate(params);
	},
	evaluate: (params) => params.reduce((sum, v) => sum + v, 0),
	schema: {
		type: "number",
	},
};

export const aggregativeDefinitions = {
	$count,
	$max,
	$min,
	$sum,
};
