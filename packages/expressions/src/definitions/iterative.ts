const $filter = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).filter((item) => evaluate(subexpr, item)),
});

const $flatMap = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input)
			.flatMap((item) => evaluate(subexpr, item))
			.filter((item) => item != null),
});

const $map = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).map((item) => evaluate(subexpr, item)),
});

export const iterativeDefinitions = {
	$filter,
	$flatMap,
	$map,
} as const;

// apply: ([items, subexpr], input) => {
// 	console.log(items, subexpr, input);
// 	console.log('e', evaluate(items, input))
// 	evaluate(items, input).flatMap((item) => evaluate(subexpr, item))
// },
