const $random = {
	name: "$random",
	apply: (operand = {}) => {
		const { min = 0, max = 1, precision = null } = operand ?? {};
		const value = Math.random() * (max - min) + min;

		if (precision == null) {
			return value;
		}

		if (precision >= 0) {
			// Positive precision: decimal places
			return Number(value.toFixed(precision));
		} else {
			// Negative precision: round to 10^(-precision)
			const factor = Math.pow(10, -precision);
			return Math.round(value / factor) * factor;
		}
	},
	evaluate(operand = {}) {
		return this.apply(operand);
	},
};

const $uuid = {
	name: "$uuid",
	apply: () => crypto.randomUUID(),
	evaluate: () => crypto.randomUUID(),
};

export const generativeDefinitions = {
	$random,
	$uuid,
};
