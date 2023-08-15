import { Operation } from "../expressions";

const $and: Operation<any, any, boolean> = {
	name: "and",
	apply: (params) => params.every(Boolean),
	evaluate: (params) => params.every(Boolean),
	inject: (subexprs, inject) => ({
		$and: subexprs.map(inject),
	}),
	schema: {
		type: "boolean",
	},
};

const $or: Operation<any, any, boolean> = {
	name: "or",
	apply: (params) => params.some(Boolean),
	evaluate: (params) => params.some(Boolean),
	inject: (subexprs, inject) => ({
		$or: subexprs.map(inject),
	}),
	schema: {
		type: "boolean",
	},
};

export const logicalDefinitions = {
	$and,
	$or,
} as const;
