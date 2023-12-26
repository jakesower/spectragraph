import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues } from "lodash-es";
import { Query, QueryInfo, RootQuery, normalizeQuery } from "./query";
import { Schema } from "./schema";

const { isExpression } = defaultExpressionEngine;

export type SchemaQueryInfo<S extends Schema> = QueryInfo & {
	type: string & keyof S["resources"];
};

export function forEachSchemaQuery<S extends Schema>(
	schema: S,
	query: RootQuery,
	fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown,
) {
	const go = (subquery: Query, info: SchemaQueryInfo<S>) => {
		fn(subquery, info);

		const { path, type } = info;
		const resourceSchema = schema.resources[type];

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

export function reduceSchemaQuery<S extends Schema, T>(
	schema: S,
	query: RootQuery,
	fn: (acc: T, subquery: Query, info: SchemaQueryInfo<S>) => T,
	init: T,
) {
	const go = (subquery: Query, info: SchemaQueryInfo<S>, accValue) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

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
			fn(accValue, subquery, info),
		);
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	return go(normalizeQuery(query), initInfo, init);
}
