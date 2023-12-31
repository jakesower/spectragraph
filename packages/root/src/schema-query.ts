import { defaultExpressionEngine } from "@data-prism/expressions";
import { Query, QueryInfo, RootQuery, normalizeQuery } from "./query";
import { Schema } from "./schema";
import { mapValues, pick } from "lodash-es";

const { isExpression } = defaultExpressionEngine;

type ParentQueryInfo<S extends Schema> = QueryInfo & {
	type: string & keyof S["resources"];
};

export type SchemaQueryInfo<S extends Schema> = ParentQueryInfo<S> & {
	attributes: string[];
	relationships: { [k: string]: Query };
};

export function forEachQuery<S extends Schema>(
	schema: S,
	query: RootQuery,
	fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown,
) {
	const go = (subquery: Query, info: ParentQueryInfo<S>) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter(
			(a) => a in subquery.select,
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

		const attributes = Object.keys(resourceSchema.attributes).filter(
			(a) => a in subquery.select,
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

		const attributes = Object.keys(resourceSchema.attributes).filter(
			(a) => a in subquery.select,
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
