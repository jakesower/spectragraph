import { createExpressionEngine } from "@data-prism/core";
import { mapValues } from "lodash-es";

export let whereExpressionEngine;

const extractWhere = (where, table) =>
	Object.entries(where).map(([propKey, propValOrExpr]) => {
		if (whereExpressionEngine.isExpression(where)) {
			return whereExpressionEngine.evaluate(where);
		}

		if (whereExpressionEngine.isExpression(propValOrExpr)) {
			const [operation, args] = Object.entries(propValOrExpr)[0];
			return { [operation]: [`${table}.${propKey}`, args] };
		}

		return { $eq: [`${table}.${propKey}`, propValOrExpr] };
	});

const sqlExpressions = {
	$and: {
		name: "$and",
		where: (operand) => operand.join(" AND "),
		vars: (operand) => operand.flat(),
	},
	$eq: {
		name: "$equal",
		where: (operand) => `${operand[0]} = ?`,
		vars: (operand) => operand[1],
	},
	$gt: {
		name: "$gt",
		where: (operand) => `${operand[0]} > ?`,
		vars: (operand) => operand[1],
	},
	$gte: {
		name: "$gte",
		where: (operand) => `${operand[0]} >= ?`,
		vars: (operand) => operand[1],
	},
	$lt: {
		name: "$lt",
		where: (operand) => `${operand[0]} < ?`,
		vars: (operand) => operand[1],
	},
	$lte: {
		name: "$lte",
		where: (operand) => `${operand[0]} <= ?`,
		vars: (operand) => operand[1],
	},
	$ne: {
		name: "$ne",
		where: (operand) => `${operand[0]} != ?`,
		vars: (operand) => operand[1],
	},
	$in: {
		name: "$in",
		where: (operand) =>
			`${operand[0]} IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$nin: {
		name: "$nin",
		where: (operand) =>
			`${operand[0]} NOT IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$or: {
		name: "$or",
		controlsEvaluation: true,
		where: (operand, { evaluate }) => {
			console.log("$or where operand:", operand, typeof operand);
			if (!Array.isArray(operand)) {
				console.log("$or operand is not array, it's:", typeof operand, operand);
				throw new Error("$or operand must be an array");
			}
			const evaluated = operand.map(evaluate);
			return `(${evaluated.join(" OR ")})`;
		},
		vars: (operand, { evaluate }) => {
			console.log("$or vars operand:", operand, typeof operand);
			if (!Array.isArray(operand)) {
				console.log("$or vars operand is not array, it's:", typeof operand, operand);
				throw new Error("$or operand must be an array");
			}
			return operand.flatMap((op) => evaluate(op));
		},
	},
};

whereExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.where })),
);

export const varsExpressionEngine = createExpressionEngine(
	mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.vars })),
);
