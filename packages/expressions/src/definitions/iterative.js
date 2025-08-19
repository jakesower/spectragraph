const $filter = {
	apply: (operand, inputData, apply) => inputData.filter((item) => apply(operand, item)),
	controlsEvaluation: true,
};

const $flatMap = {
	apply: (operand, inputData, apply) => inputData.flatMap((item) => apply(operand, item)),
	controlsEvaluation: true,
};

const $map = {
	apply: (operand, inputData, apply) => inputData.map((item) => apply(operand, item)),
	controlsEvaluation: true,
};

export const iterativeDefinitions = {
	$filter,
	$flatMap,
	$map,
};

// apply: ([items, subexpr], arg) => {
// 	console.log(items, subexpr, arg);
// 	console.log('e', evaluate(items, arg))
// 	evaluate(items, arg).flatMap((item) => evaluate(subexpr, item))
// },
