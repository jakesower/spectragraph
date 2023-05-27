const $count = {
	apply: (evaluatedArgs) => evaluatedArgs.length,
};

const $sum = {
	apply: (evaluatedArgs) => evaluatedArgs.reduce((sum, v) => sum + v, 0),
};

export const mathDefinitions = {
	$count,
	$sum,
} as const;
