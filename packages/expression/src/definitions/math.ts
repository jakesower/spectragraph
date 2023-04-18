import { Expression } from "../expression";

const $count: Expression<any, any, number> = {
	apply: (evaluatedArgs) => evaluatedArgs.length,
};

const $sum: Expression<any, any, number> = {
	apply: (evaluatedArgs) => evaluatedArgs.reduce((sum, v) => sum + v, 0),
};

export const mathDefinitions = {
	$count,
	$sum,
} as const;
