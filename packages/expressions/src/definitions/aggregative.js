const $count = {
	name: "$count",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.length,
	schema: {
		type: "integer",
		minimum: 0,
	},
};

const $max = {
	name: "$max",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((max, v) => Math.max(max, v)),
	schema: {
		type: "number",
	},
};

const $min = {
	name: "$min",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((min, v) => Math.min(min, v)),
	schema: {
		type: "number",
	},
};

const $sum = {
	name: "$sum",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => operand.reduce((sum, v) => sum + v, 0),
	schema: {
		type: "number",
	},
};

const $mean = {
	name: "$mean",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) =>
		operand.length === 0
			? undefined
			: operand.reduce((sum, v) => sum + v, 0) / operand.length,
	schema: {
		type: "number",
	},
};

const $median = {
	name: "$median",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const sorted = [...operand].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	},
	schema: {
		type: "number",
	},
};

const $mode = {
	name: "$mode",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: (operand) => {
		if (operand.length === 0) return undefined;
		const frequency = {};
		let maxCount = 0;
		let modes = [];

		// Count frequencies
		for (const value of operand) {
			frequency[value] = (frequency[value] ?? 0) + 1;
			if (frequency[value] > maxCount) {
				maxCount = frequency[value];
				modes = [value];
			} else if (frequency[value] === maxCount && !modes.includes(value)) {
				modes.push(value);
			}
		}

		// Return single mode if only one, array if multiple, or undefined if all values appear once
		return maxCount === 1
			? undefined
			: modes.length === 1
				? modes[0]
				: modes.sort((a, b) => a - b);
	},
	schema: {
		type: ["number", "array"],
	},
};

const $quantile = {
	name: "$quantile",
	apply(operand) {
		return this.evaluate(operand);
	},
	evaluate: ({ values, k, n }) => {
		if (!Array.isArray(values) || values.length === 0) return undefined;
		if (typeof k !== "number" || typeof n !== "number") {
			throw new Error("k and n must be numbers");
		}
		if (k < 0 || k > n || n <= 0) {
			throw new Error("k must be between 0 and n, and n must be positive");
		}
		if (k === 0) return Math.min(...values);
		if (k === n) return Math.max(...values);

		const sorted = [...values].sort((a, b) => a - b);
		const index = (k / n) * (sorted.length - 1);
		const lower = Math.floor(index);
		const upper = Math.ceil(index);

		if (lower === upper) {
			return sorted[lower];
		}

		// Linear interpolation
		const weight = index - lower;
		return sorted[lower] * (1 - weight) + sorted[upper] * weight;
	},
	schema: {
		type: "number",
	},
};

export const aggregativeDefinitions = {
	$count,
	$max,
	$mean,
	$median,
	$min,
	$mode,
	$quantile,
	$sum,
};
