import { Expression } from "../expression";

const $and: Expression<any, any, boolean> = {
	name: "and",
	apply: (params) => params.every(Boolean),
	distribute: (subexprs, distribute) => ({
		$and: subexprs.map(distribute),
	}),
};

export const logicalDefinitions = {
	$and,
} as const;
