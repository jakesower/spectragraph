import { createExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

export let whereExpressionEngine;

const extractWhere = (where, table) =>
	Object.entries(where).map(([propKey, propValOrExpr]) => {
		if (whereExpressionEngine.isExpression(where)) {
			const [operation, args] = Object.entries(where)[0];
			return whereExpressionEngine.evaluate(where);
		}

		if (whereExpressionEngine.isExpression(propValOrExpr)) {
			const [operation, args] = Object.entries(propValOrExpr)[0];
			console.log("hi", { [operation]: [`${table}.${propKey}`, args] });
			return { [operation]: [`${table}.${propKey}`, args] };
		}

		return { $eq: [`${table}.${propKey}`, propValOrExpr] };
	});

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
		where: (params) =>
			`${params[0]} IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
	$nin: {
		name: "not contained in",
		where: (params) =>
			`${params[0]} NOT IN (${params[1].map(() => "?").join(",")})`,
		vars: (params) => params[1],
	},
	$or: {
		// TODO
		name: "or",
		controlsEvaluation: true,
		where: (params, evaluate) => {
			console.log("args", params.map(evaluate));
		},
		vars: (...args) => {
			console.log("Var args", args);
		},
	},
};

whereExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.where })),
);

export const varsExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.vars })),
);
