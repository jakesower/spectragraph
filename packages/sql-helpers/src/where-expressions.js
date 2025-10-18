import { ExpressionNotSupportedError } from "@spectragraph/core";
import { snakeCase } from "es-toolkit";

const safeColumnName = (colName) => {
	const snaked = snakeCase(colName);

	// Valid SQL column name: alphanumeric, underscores, starts with letter or underscore
	// Also allow JSON path operators like ->, ->>, #>, #>> followed by valid paths
	const columnPattern = /^[a-z_][a-z0-9_]*$/i;
	const jsonPattern =
		/^[a-z_][a-z0-9_]*(->>?|#>>?)('[^']*'|\$[a-z_][a-z0-9_]*(\.\$[a-z_][a-z0-9_]*)*)$/i;

	if (!columnPattern.test(snaked) && !jsonPattern.test(snaked)) {
		throw new Error(`Invalid column name: ${colName}`);
	}

	return snaked;
};

const comparativeExpression = (symbol) => ({
	where: (operand, inputData, { apply, isExpression }) => {
		if (!Array.isArray(operand)) {
			const first = inputData ?? "?";
			const second = isExpression(operand) ? apply(operand) : "?";
			return `${first} ${symbol} ${second}`;
		}

		const [first, second] = operand.map((o) =>
			isExpression(o) ? apply(o) : "?",
		);
		return `${first} ${symbol} ${second}`;
	},
	vars: (operand, _, { apply, isExpression }) => {
		if (Array.isArray(operand)) {
			return operand.flatMap((o) => (isExpression(o) ? apply(o) : o));
		}
		const result = apply(operand);
		return Array.isArray(result) ? result.flat() : [result];
	},
});

export const DEFAULT_WHERE_EXPRESSIONS = {
	// logical
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

	// comparative
	$eq: comparativeExpression("="),
	$gt: comparativeExpression(">"),
	$gte: comparativeExpression(">="),
	$lt: comparativeExpression("<"),
	$lte: comparativeExpression("<="),
	$ne: comparativeExpression("!="),
	$in: {
		where: (operand, inputData) =>
			`${inputData ?? ""} IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand.flat(),
	},
	$nin: {
		where: (operand, inputData) =>
			`${inputData ?? ""} NOT IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$get: {
		where: (operand) => safeColumnName(operand),
		vars: () => [],
	},

	// predicate
	$matchesAll: {
		where: (operand, _, { apply, isExpression }) => {
			const items = Object.entries(operand).map(
				([attribute, value]) =>
					` ${isExpression(value) ? apply(value, safeColumnName(attribute)) : `${safeColumnName(attribute)} = ?`}`,
			);
			return ` (${items.join(" AND ")})`;
		},
		vars: (operand, _, { apply, isExpression }) => {
			const items = Object.values(operand).map((value) =>
				isExpression(value) ? apply(value) : value,
			);
			return items.flat();
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

	// comparative
	$if: {
		where: (operand, _, { apply, isExpression }) => {
			const condition = apply(operand.if);
			const thenClause =
				isExpression(operand.then) || typeof operand.then === "object"
					? apply(operand.then)
					: "?";
			const elseClause =
				isExpression(operand.else) || typeof operand.else === "object"
					? apply(operand.else)
					: "?";
			return ` CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, _, { apply, isExpression }) => {
			const ifResult = apply(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then) || typeof operand.then === "object") {
				const thenResult = apply(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else if (operand.then !== null) {
				// Only push primitive values
				vars.push(operand.then);
			}
			if (isExpression(operand.else) || typeof operand.else === "object") {
				const elseResult = apply(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else if (operand.else !== null) {
				// Only push primitive values
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

	// util
	$debug: {
		where: (operand, _, { apply }) => apply(operand),
		vars: (operand, _, { apply }) => apply(operand),
	},

	$pipe: {
		where: (operand, _, { apply }) => operand.map(apply).join(""),
		vars: (operand, _, { apply }) => operand.map(apply).flat(),
	},
};
