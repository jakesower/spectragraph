const $filter = (apply) => ({
	apply: (subexpr, arg) => arg.filter((item) => apply(subexpr, item)),
});

const $flatMap = (apply) => ({
	apply: (subexpr, arg) => arg.flatMap((item) => apply(subexpr, item)),
});

const $map = (apply) => ({
	apply: (subexpr, arg) => arg.map((item) => apply(subexpr, item)),
});

export const iterativeDefinitions = {
	$filter,
	$flatMap,
	$map,
} as const;

// apply: ([items, subexpr], arg) => {
// 	console.log(items, subexpr, arg);
// 	console.log('e', evaluate(items, arg))
// 	evaluate(items, arg).flatMap((item) => evaluate(subexpr, item))
// },
