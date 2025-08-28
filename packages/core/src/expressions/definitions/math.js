const $add = {
	name: "$add",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$add apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$add apply form requires number input data");
		}
		return inputData + operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error("$add evaluate form requires array of exactly 2 numbers");
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error("$add evaluate form requires array of exactly 2 numbers");
		}
		return operand[0] + operand[1];
	},
};

const $subtract = {
	name: "$subtract",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$subtract apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$subtract apply form requires number input data");
		}
		return inputData - operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		}
		return operand[0] - operand[1];
	},
};

const $multiply = {
	name: "$multiply",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$multiply apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$multiply apply form requires number input data");
		}
		return inputData * operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		}
		return operand[0] * operand[1];
	},
};

const $divide = {
	name: "$divide",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$divide apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$divide apply form requires number input data");
		}
		if (operand === 0) {
			throw new Error("Division by zero");
		}
		return inputData / operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		}
		if (operand[1] === 0) {
			throw new Error("Division by zero");
		}
		return operand[0] / operand[1];
	},
};

const $modulo = {
	name: "$modulo",
	apply: (operand, inputData) => {
		if (typeof operand !== "number") {
			throw new Error("$modulo apply form requires number operand");
		}
		if (typeof inputData !== "number") {
			throw new Error("$modulo apply form requires number input data");
		}
		if (operand === 0) {
			throw new Error("Modulo by zero");
		}
		return inputData % operand;
	},
	evaluate: (operand) => {
		if (!Array.isArray(operand) || operand.length !== 2) {
			throw new Error(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		}
		if (typeof operand[0] !== "number" || typeof operand[1] !== "number") {
			throw new Error(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		}
		if (operand[1] === 0) {
			throw new Error("Modulo by zero");
		}
		return operand[0] % operand[1];
	},
};

export const mathDefinitions = {
	$add,
	$subtract,
	$multiply,
	$divide,
	$modulo,
};
