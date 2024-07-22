import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, pick } from "lodash-es";
import { Schema } from "./schema";

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
	order?: { [k: string]: "asc" | "desc" }[];
};

export type NormalRootQuery = RootQuery & NormalQuery;

export type QueryInfo = {
	path: string[];
	parent: Query | null;
};

type ParentQueryInfo<S extends Schema> = QueryInfo & {
	type: string & keyof S["resources"];
};

export type SchemaQueryInfo<S extends Schema> = ParentQueryInfo<S> & {
	attributes: string[];
	relationships: { [k: string]: Query };
};

const { isExpression } = defaultExpressionEngine;

export function normalizeQuery(rootQuery: RootQuery): NormalRootQuery {
	const stringToProp = (str) => ({ [str]: str });

	const go = (query: Query): NormalQuery => {
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
		} as NormalQuery;
	};

	return go(rootQuery) as NormalRootQuery;
}

export function forEachSchemalessQuery(query, fn) {
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

export function mapSchemalessQuery(query, fn) {
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

export function reduceSchemalessQuery(query, fn, init) {
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

export function forEachQuery<S extends Schema>(
	schema: S,
	query: RootQuery,
	fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown,
) {
	const go = (subquery: Query, info: ParentQueryInfo<S>) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		) as { [k: string]: Query };

		const fullInfo = {
			...info,
			attributes,
			relationships,
		};

		fn(subquery, fullInfo);

		Object.entries(subquery.select).forEach(([prop, select]) => {
			if (typeof select === "object" && !isExpression(select)) {
				const nextInfo = {
					path: [...path, prop],
					parent: subquery,
					type: resourceSchema.relationships[prop].type,
				};

				go(select as Query, nextInfo);
			}
		});
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	go(normalizeQuery(query), initInfo);
}

export function mapQuery<S extends Schema>(
	schema: S,
	query: RootQuery,
	fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown,
) {
	const go = (subquery: Query, info: ParentQueryInfo<S>) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		) as { [k: string]: Query };

		const fullInfo = {
			...info,
			attributes,
			relationships,
		};

		const mappedSelect = mapValues(subquery.select, (select, prop) => {
			if (typeof select !== "object" || isExpression(select)) return select;

			const nextInfo = {
				path: [...path, prop],
				parent: subquery,
				type: resourceSchema.relationships[prop].type,
			};

			return go(select as Query, nextInfo);
		});

		return fn({ ...subquery, select: mappedSelect }, fullInfo);
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	return go(normalizeQuery(query), initInfo);
}

export function reduceQuery<S extends Schema, T>(
	schema: S,
	query: RootQuery,
	fn: (acc: T, subquery: Query, info: SchemaQueryInfo<S>) => T,
	init: T,
) {
	const go = (subquery: Query, info: ParentQueryInfo<S>, accValue) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		) as { [k: string]: Query };

		const fullInfo = {
			...info,
			attributes,
			relationships,
		};

		return Object.entries(subquery.select).reduce(
			(acc, [prop, select]) => {
				if (typeof select !== "object" || isExpression(select)) return acc;

				const nextInfo = {
					path: [...path, prop],
					parent: subquery,
					type: resourceSchema.relationships[prop].type,
				};

				return go(select as Query, nextInfo, acc);
			},
			fn(accValue, subquery, fullInfo),
		);
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	return go(normalizeQuery(query), initInfo, init);
}
