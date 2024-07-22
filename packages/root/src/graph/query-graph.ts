import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, orderBy } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
import { NormalRootQuery, RootQuery, normalizeQuery } from "../query.js";
import { buildWhereExpression } from "./where-helpers.js";
import { createExpressionProjector } from "./select-helpers.js";
import { Graph, Ref } from "../graph.js";

export type Result = {
	[k: string]: unknown;
};

type QueryGraph = {
	query: <Q extends RootQuery>(query: Q) => Result;
};

const ID = Symbol("id");
const TYPE = Symbol("type");
const RAW = Symbol("raw");

function prepData(resources) {
	const data = {};
	Object.entries(resources).forEach(([resType, ressOfType]) => {
		data[resType] = {};
		Object.entries(ressOfType).forEach(([resId, res]) => {
			const val = {};

			val[TYPE] = resType;
			val[ID] = resId;
			val[RAW] = {
				...res,
				id: resId,
				resType: resType,
			};

			Object.entries(res.attributes).forEach(([attrName, attrVal]) => {
				val[attrName] = attrVal;
			});

			Object.entries(res.relationships).forEach(([relName, relVal]) => {
				Object.defineProperty(val, relName, {
					get() {
						const dereffed = applyOrMap(
							relVal,
							(rel: Ref) => data[rel.type][rel.id],
						);
						Object.defineProperty(this, relName, {
							value: dereffed,
							writable: false,
							configurable: false,
						});

						return dereffed;
					},
					configurable: true,
					enumerable: true,
				});
			});

			data[resType][resId] = val;
		});
	});

	return data;
}

function runQuery<Q extends NormalRootQuery>(
	rootQuery: Q,
	data: object,
): Result {
	const go = (query) => {
		if (query.id && !data[query.type][query.id]) return null;

		// these are in order of execution
		const operationDefinitions = {
			where(results: unknown[]): unknown[] {
				if (Object.keys(query.where).length === 0) return results;

				const whereExpression = buildWhereExpression(
					query.where,
					defaultExpressionEngine,
				);
				return results.filter((result) =>
					defaultExpressionEngine.apply(whereExpression, result),
				);
			},
			order(results: unknown[]): unknown[] {
				const order = Array.isArray(query.order) ? query.order : [query.order];
				const properties = order.flatMap((o) => Object.keys(o));
				const dirs = order.flatMap((o) => Object.values(o));

				return orderBy(results, properties, dirs);
			},
			limit(results: unknown[]): unknown[] {
				const { limit, offset = 0 } = query;
				if (limit < 1) throw new Error("`limit` must be at least 1");

				return results.slice(offset, limit + offset);
			},
			offset(results: unknown[]): unknown[] {
				if (query.offset < 0) throw new Error("`offset` must be at least 0");
				return query.limit ? results : results.slice(query.offset);
			},
			select(results) {
				const { select } = query;
				const projectors = mapValues(select, (propQuery, propName) => {
					// possibilities: (1) property (2) expression (3) subquery
					if (typeof propQuery === "string") {
						// nested / shallow property
						return (result) =>
							propQuery in result[RAW].relationships
								? result[RAW].relationships[propQuery]
								: propQuery
										.split(".")
										.reduce(
											(out, path) => (out === null ? null : out?.[path]),
											result,
										);
					}

					// expression
					if (defaultExpressionEngine.isExpression(propQuery)) {
						return createExpressionProjector(
							propQuery,
							defaultExpressionEngine,
						);
					}

					// subquery
					return (result) => {
						if (result[propName] === undefined) {
							throw new Error(
								`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably constructed your graph wrong. Try linking the inverses (via "linkInverses") and check your schema to make sure all inverses have been defined correctly there.`,
							);
						}

						if (Array.isArray(result[propName])) {
							return result[propName]
								.map((r) => {
									if (r === undefined) {
										throw new Error(
											`A related resource was not found on resource ${
												query.type
											}.${query.id}. ${propName}: ${JSON.stringify(
												result[propName],
											)}. Check that all of the refs in ${query.type}.${
												query.id
											} are valid.`,
										);
									}

									return go({ ...propQuery, type: r[TYPE], id: r[ID] });
								})
								.filter(Boolean);
						}

						if (result[propName] === undefined) {
							throw new Error(
								`A related resource was not found on resource ${query.type}.${
									query.id
								}. ${propName}: ${JSON.stringify(
									result[RAW].relationships[propName],
								)}. Check that all of the refs in ${query.type}.${
									query.id
								} are valid.`,
							);
						}

						if (result[propName] === null) return null;

						return go({
							...propQuery,
							type: result[propName][TYPE],
							id: result[propName][ID],
						});
					};
				});

				return results.map((result) =>
					mapValues(projectors, (project) => project(result)),
				);
			},
		};

		const results = query.id
			? [data[query.type][query.id]]
			: Object.values(data[query.type]);

		const processed = Object.entries(operationDefinitions).reduce(
			(acc, [opName, fn]) => (opName in query ? fn(acc) : acc),
			results,
		);

		return query.id ? processed[0] : processed;
	};

	return go(rootQuery);
}

export function createQueryGraph(graph: Graph): QueryGraph {
	const data = prepData(graph);

	return {
		query<Q extends RootQuery>(query: Q): Result {
			const compiled = normalizeQuery(query);
			return runQuery(compiled, data) as Result;
		},
	};
}

export function queryGraph<Q extends RootQuery>(
	graph: Graph,
	query: Q,
): Result {
	return createQueryGraph(graph).query(query);
}
