import { createExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

const sqlExpressions = {
	$and: {
		name: "and",
		where: (params) => params.join(" AND "),
		vars: (params) => params.flat(),
	},
	$eq: {
		name: "equal",
		where: (params) => `${params[0]} = ?`,
		vars: (params) => params[1],
	},
	$gt: {
		name: "greater than",
		where: (params) => `${params[0]} > ?`,
		vars: (params) => params[1],
	},
	$gte: {
		name: "greater than or equal to",
		where: (params) => `${params[0]} >= ?`,
		vars: (params) => params[1],
	},
	$lt: {
		name: "less than",
		where: (params) => `${params[0]} < ?`,
		vars: (params) => params[1],
	},
	$lte: {
		name: "less than or equal to",
		where: (params) => `${params[0]} <= ?`,
		vars: (params) => params[1],
	},
	$ne: {
		name: "not equal",
		where: (params) => `${params[0]} != ?`,
		vars: (params) => params[1],
	},
	$in: {
		name: "contained in",
		where: (params) => `${params[0]} IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
	$nin: {
		name: "not contained in",
		where: (params) => `${params[0]} NOT IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
};

export const whereExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, apply: expr.where })),
);

export const varsExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, apply: expr.vars })),
);
