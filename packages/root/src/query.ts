import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

export type Expression = {
	[k: string]: unknown;
};

export type Query = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select:
		| readonly (string | { [k: string]: string | Query | Expression })[]
		| {
				[k: string]: string | Query | Expression;
		  };
	type?: string;
	where?: { [k: string]: unknown };
};

export type RootQuery = Query & {
	type: string;
};

export type NormalQuery = Query & {
	select: {
		[k: string]: string | NormalQuery | Expression;
	};
};

export type NormalRootQuery = RootQuery & NormalQuery;

export type QueryInfo = {
	path: string[];
	parent: Query | null;
};

const { isExpression } = defaultExpressionEngine;

export function normalizeQuery(rootQuery: RootQuery): NormalRootQuery {
	const stringToProp = (str) => ({ [str]: str });

	const go = (query: Query): NormalQuery => {
		const { select } = query;
		const selectObj = Array.isArray(select)
			? select.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const subqueries = mapValues(selectObj, (sel) =>
			typeof sel === "object" && !isExpression(sel) ? go(sel) : sel,
		);

		return { ...query, select: subqueries };
	};

	return go(rootQuery) as NormalRootQuery;
}

export function foreachQuery(query, fn) {
	const go = (subquery: Query, info: QueryInfo) => {
		fn(subquery, info);

		Object.entries(subquery.select).forEach(([prop, select]) => {
			if (typeof select === "object" && !isExpression(select)) {
				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				go(select as Query, nextInfo);
			}
		});
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	go(normalizeQuery(query), initInfo);
}

export function mapQuery(query, fn) {
	const go = (subquery: Query, info: QueryInfo) => {
		const mappedSelect = mapValues(subquery.select, (select, prop) => {
			if (typeof select !== "object" || isExpression(select)) return select;

			const nextInfo = {
				path: [...info.path, prop],
				parent: subquery,
			};

			return go(select as Query, nextInfo);
		});

		return fn({ ...subquery, select: mappedSelect }, info);
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeQuery(query), initInfo);
}

export function reduceQuery(query, fn, init) {
	const go = (subquery: Query, info: QueryInfo, accValue) =>
		Object.entries(subquery.select).reduce(
			(acc, [prop, select]) => {
				if (typeof select !== "object" || isExpression(select)) return acc;

				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				return go(select as Query, nextInfo, acc);
			},
			fn(accValue, subquery, info),
		);

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeQuery(query), initInfo, init);
}
