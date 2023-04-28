import { FunctionExpression } from "../expression";

const $filter = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).filter((item) => evaluate(subexpr, item)),
});

const $flatMap: FunctionExpression<any, any, number> = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).flatMap((item) => evaluate(subexpr, item)),
});

const $map: FunctionExpression<any, any, number> = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).map((item) => evaluate(subexpr, item)),
});

export const iterativeDefinitions = {
	$filter,
	$flatMap,
	$map,
} as const;
