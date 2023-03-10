import { Expression } from "../expression";

const $and: Expression<any, any, boolean> = {
	name: "and",
	apply: (params) => params.every(Boolean),
	compile: (predicates) => (val) => predicates.every((p) => p.apply(val)),
	distributeParams: (subexprs, distribute) => ({
		$and: subexprs.map(distribute),
	}),
	evaluate: (args) => args.every(Boolean),
};

export const logicalDefinitions = {
	$and,
} as const;
