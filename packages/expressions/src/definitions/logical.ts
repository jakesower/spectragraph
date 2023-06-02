import { Expression } from "../expression";

const $and: Expression<any, any, boolean> = {
	name: "and",
	apply: (params) => params.every(Boolean),
	distribute: (subexprs, distribute) => ({
		$and: subexprs.map(distribute),
	}),
	schema: {
		type: "boolean",
	},
};

const $or: Expression<any, any, boolean> = {
	name: "or",
	apply: (params) => params.some(Boolean),
	distribute: (subexprs, distribute) => ({
		$or: subexprs.map(distribute),
	}),
	schema: {
		type: "boolean",
	},
};

export const logicalDefinitions = {
	$and,
	$or,
} as const;
