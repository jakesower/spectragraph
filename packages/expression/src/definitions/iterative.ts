import { FunctionExpression } from "../expression";

const $map: FunctionExpression<any, any, number> = (evaluate) => ({
	apply: ([items, subexpr], input) =>
		evaluate(items, input).map((item) => evaluate(subexpr, item)),
});

export const iterativeDefinitions = {
	$map,
} as const;
