import { mapValues, snakeCase, uniq } from "lodash-es";
import { whereExpressionEngine } from "./sql-expressions.js";

const defaultClause = {
	compose: (acc, item) => uniq([...(acc ?? []), ...(item ?? [])]),
	initVal: [],
};

const SQL_CLAUSE_CONFIG = {
	select: {
		...defaultClause,
		toSql: (val) => `SELECT ${val.join(", ")}`,
	},
	from: {
		...defaultClause,
		compose: (acc, item) => [...acc, item],
		initVal: [],
		toSql: (val) => `FROM ${uniq(val).join(", ")}`,
	},
	join: {
		...defaultClause,
		toSql: (val) => val.join("\n"),
	},
	where: {
		...defaultClause,
		toSql: (val) =>
			val.length > 0
				? `WHERE ${whereExpressionEngine.evaluate({ $and: val })}`
				: "",
	},
	vars: {
		...defaultClause,
		toSql: () => "",
	},
	orderBy: {
		...defaultClause,
		toSql: (val) => {
			if (val.length === 0) return "";

			const orderClauses = val.map(
				({ property, direction, table }) =>
					`${table}.${snakeCase(property)}${
						direction === "desc" ? " DESC" : ""
					}`,
			);
			return `ORDER BY ${orderClauses.join(", ")}`;
		},
	},
	limit: {
		...defaultClause,
		compose: (acc, item) => Math.min(acc, item),
		initVal: Infinity,
		toSql: (val) => (val < Infinity ? `LIMIT ${val}` : ""),
	},
	offset: {
		...defaultClause,
		compose: (_, item) => item,
		initVal: 0,
		toSql: (val) => (val > 0 ? `OFFSET ${val}` : ""),
	},
};

export function buildSql(queryClauses) {
	return Object.entries(SQL_CLAUSE_CONFIG)
		.map(([clauseKey, clauseDef]) => clauseDef.toSql(queryClauses[clauseKey]))
		.filter(Boolean)
		.join("\n");
}

export function composeClauses(queryModifiers) {
	return queryModifiers.reduce(
		(acc, condObj) => ({
			...acc,
			...mapValues(condObj, (condVal, clauseKey) =>
				SQL_CLAUSE_CONFIG[clauseKey].compose(acc[clauseKey], condVal),
			),
		}),
		mapValues(SQL_CLAUSE_CONFIG, (clause) => clause.initVal),
	);
}
