const $filter = {
	apply: (operand, inputData, { apply }) =>
		inputData.filter((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $filter: fn }, items);
	},
};

const $flatMap = {
	apply: (operand, inputData, { apply }) =>
		inputData.flatMap((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $flatMap: fn }, items);
	},
};

const $map = {
	apply: (operand, inputData, { apply }) =>
		inputData.map((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([fn, items], { apply }) {
		return apply({ $map: fn }, items);
	},
};

const $any = {
	apply: (operand, inputData, { apply }) =>
		inputData.some((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $any: predicate }, array);
	},
};

const $all = {
	apply: (operand, inputData, { apply }) =>
		inputData.every((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $all: predicate }, array);
	},
};

const $find = {
	apply: (operand, inputData, { apply }) =>
		inputData.find((item) => apply(operand, item)),
	controlsEvaluation: true,
	evaluate([predicate, array], { apply }) {
		return apply({ $find: predicate }, array);
	},
};

const $concat = {
	apply: (operand, inputData) => inputData.concat(operand),
	evaluate([arrayToConcat, baseArray]) {
		return this.apply(arrayToConcat, baseArray);
	},
};

const $join = {
	apply: (operand, inputData) => inputData.join(operand),
	evaluate([separator, array]) {
		return this.apply(separator, array);
	},
};

const $reverse = {
	apply: (_, inputData) => inputData.slice().reverse(),
	evaluate(array) {
		return this.apply(null, array);
	},
};

export const iterativeDefinitions = {
	$all,
	$any,
	$concat,
	$filter,
	$find,
	$flatMap,
	$join,
	$map,
	$reverse,
};
