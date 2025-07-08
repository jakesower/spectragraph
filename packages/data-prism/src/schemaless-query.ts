import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";

export type Expression = {
	[k: string]: unknown;
};

export type SchemalessQuery = {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select:
		| readonly (string | { [k: string]: string | SchemalessQuery | Expression })[]
		| {
				[k: string]: string | SchemalessQuery | Expression;
			};
	type?: string;
	where?: { [k: string]: unknown };
};

export type RootSchemalessQuery = SchemalessQuery & {
	type: string;
};

export type NormalSchemalessQuery = SchemalessQuery & {
	select: {
		[k: string]: string | NormalSchemalessQuery | Expression;
	};
	order?: { [k: string]: "asc" | "desc" }[];
};

export type NormalRootSchemalessQuery = RootSchemalessQuery & NormalSchemalessQuery;

export type SchemalessQueryInfo = {
	path: string[];
	parent: SchemalessQuery | null;
};

const { isExpression } = defaultExpressionEngine;

export function normalizeSchemalessQuery(
	rootSchemalessQuery: RootSchemalessQuery,
): NormalRootSchemalessQuery {
	const stringToProp = (str) => ({ [str]: str });

	const go = (query: SchemalessQuery): NormalSchemalessQuery => {
		const { select } = query;

		if (!select) throw new Error("queries must have a `select` clause");

		const selectObj = Array.isArray(select)
			? select.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const subqueries = mapValues(selectObj, (sel) =>
			typeof sel === "object" && !isExpression(sel) ? go(sel) : sel,
		);

		const orderObj = query.order
			? { order: !Array.isArray(query.order) ? [query.order] : query.order }
			: {};

		return {
			...query,
			select: subqueries,
			...orderObj,
		} as NormalSchemalessQuery;
	};

	return go(rootSchemalessQuery) as NormalRootSchemalessQuery;
}

export function forEachSchemalessQuery(query, fn) {
	const go = (subquery: SchemalessQuery, info: SchemalessQueryInfo) => {
		fn(subquery, info);

		Object.entries(subquery.select).forEach(([prop, select]) => {
			if (typeof select === "object" && !isExpression(select)) {
				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				go(select as SchemalessQuery, nextInfo);
			}
		});
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	go(normalizeSchemalessQuery(query), initInfo);
}

export function mapSchemalessQuery(query, fn) {
	const go = (subquery: SchemalessQuery, info: SchemalessQueryInfo) => {
		const mappedSelect = mapValues(subquery.select, (select, prop) => {
			if (typeof select !== "object" || isExpression(select)) return select;

			const nextInfo = {
				path: [...info.path, prop],
				parent: subquery,
			};

			return go(select as SchemalessQuery, nextInfo);
		});

		return fn({ ...subquery, select: mappedSelect }, info);
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeSchemalessQuery(query), initInfo);
}

export function reduceSchemalessQuery(query, fn, init) {
	const go = (subquery: SchemalessQuery, info: SchemalessQueryInfo, accValue) =>
		Object.entries(subquery.select).reduce(
			(acc, [prop, select]) => {
				if (typeof select !== "object" || isExpression(select)) return acc;

				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				return go(select as SchemalessQuery, nextInfo, acc);
			},
			fn(accValue, subquery, info),
		);

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeSchemalessQuery(query), initInfo, init);
}