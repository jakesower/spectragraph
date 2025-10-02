import { ExpressionNotSupportedError } from "@spectragraph/core";
import { snakeCase } from "es-toolkit";

export const DEFAULT_WHERE_EXPRESSIONS = {
	$and: {
		where: (operand, _, { apply }) => `(${operand.map(apply).join(" AND ")})`,
		vars: (operand, _, { apply }) => operand.flatMap(apply),
	},
	$or: {
		where: (operand, _, { apply }) => `(${operand.map(apply).join(" OR ")})`,
		vars: (operand, _, { apply }) => operand.flatMap(apply),
	},
	$not: {
		where: (operand, _, { apply }) => `NOT (${apply(operand)})`,
		vars: (operand, _, { apply }) => apply(operand),
	},
	$eq: {
		where: () => " = ?",
		vars: (operand) => operand,
	},
	$gt: {
		where: () => " > ?",
		vars: (operand) => operand,
	},
	$gte: {
		where: () => " >= ?",
		vars: (operand) => operand,
	},
	$lt: {
		where: () => " < ?",
		vars: (operand) => operand,
	},
	$lte: {
		where: () => " <= ?",
		vars: (operand) => operand,
	},
	$ne: {
		where: () => " != ?",
		vars: (operand) => operand,
	},
	$in: {
		where: (operand) => ` IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$nin: {
		where: (operand) => ` NOT IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$get: {
		where: (operand) => snakeCase(operand),
		vars: () => [],
	},
	$pipe: {
		where: (operand, _, { apply }) => operand.map(apply).join(""),
		vars: (operand, _, { apply }) => operand.map(apply).flat(),
	},
	$compose: {
		where: (operand, _, { apply }) => operand.toReversed().map(apply).join(""),
		vars: (operand, _, { apply }) => operand.toReversed().map(apply).flat(),
	},
	$literal: {
		where: (operand) => String(operand),
		vars: () => [],
	},
	$if: {
		where: (operand, _, { apply, isExpression }) => {
			const condition = apply(operand.if);
			const thenClause = isExpression(operand.then) ? apply(operand.then) : "?";
			const elseClause = isExpression(operand.else) ? apply(operand.else) : "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, _, { apply, isExpression }) => {
			const ifResult = apply(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = apply(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = apply(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
	$case: {
		where: (operand, _, { apply, isExpression }) => {
			const value = isExpression(operand.value) ? apply(operand.value) : "?";
			let sql = `CASE ${value}`;

			for (const caseItem of operand.cases) {
				const whenClause = isExpression(caseItem.when)
					? apply(caseItem.when)
					: "?";
				const thenClause = isExpression(caseItem.then)
					? apply(caseItem.then)
					: "?";
				sql += ` WHEN ${whenClause} THEN ${thenClause}`;
			}

			const defaultClause = isExpression(operand.default)
				? apply(operand.default)
				: "?";
			sql += ` ELSE ${defaultClause} END`;

			return sql;
		},
		vars: (operand, _, { apply, isExpression }) => {
			const vars = [];

			if (isExpression(operand.value)) {
				vars.push(...apply(operand.value));
			} else {
				vars.push(operand.value);
			}

			for (const caseItem of operand.cases) {
				if (isExpression(caseItem.when)) {
					vars.push(...apply(caseItem.when));
				} else {
					vars.push(caseItem.when);
				}
				if (isExpression(caseItem.then)) {
					vars.push(...apply(caseItem.then));
				} else {
					vars.push(caseItem.then);
				}
			}

			if (isExpression(operand.default)) {
				vars.push(...apply(operand.default));
			} else {
				vars.push(operand.default);
			}

			return vars.flat();
		},
	},
	$debug: {
		where: (operand, _, { apply }) => apply(operand),
		vars: (operand, _, { apply }) => apply(operand),
	},
	$matchesLike: {
		name: "$matchesLike",
		where: () => " LIKE ?",
		vars: (operand) => operand,
	},
	$matchesGlob: {
		where: () => {
			throw new ExpressionNotSupportedError(
				"$matchesGlob",
				"store",
				"glob support is distinct to each SQL store",
			);
		},
		vars: () => {
			throw new ExpressionNotSupportedError(
				"$matchesGlob",
				"store",
				"glob support is distinct to each SQL store",
			);
		},
	},
	$matchesRegex: {
		where: () => {
			throw new ExpressionNotSupportedError(
				"$matchesRegex",
				"store",
				"regex support is distinct to each SQL store",
			);
		},
		vars: () => {
			throw new ExpressionNotSupportedError(
				"$matchesRegex",
				"store",
				"regex support is distinct to each SQL store",
			);
		},
	},
};
