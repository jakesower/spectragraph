import { Operation } from "../expressions";

const $and: Operation<any, any, boolean> = {
	name: "and",
	apply: (params) => params.every(Boolean),
	distribute: (subexprs, distribute) => ({
		$and: subexprs.map(distribute),
	}),
	schema: {
		type: "boolean",
	},
};

const $or: Operation<any, any, boolean> = {
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
