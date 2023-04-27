import { FunctionExpression } from "../expression";

const $flatMap: FunctionExpression<any, any, number> = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).flatMap((item) => evaluate(subexpr, item)),
});

const $map: FunctionExpression<any, any, number> = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).map((item) => evaluate(subexpr, item)),
});

export const iterativeDefinitions = {
	$flatMap,
	$map,
} as const;
