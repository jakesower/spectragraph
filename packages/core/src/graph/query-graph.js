import { mapValues, orderBy } from "es-toolkit";
import { applyOrMap } from "@spectragraph/utils";
import { normalizeQuery } from "../query.js";
import { defaultSelectEngine, defaultWhereEngine } from "../lib/defaults.js";
import { createExpressionProjector } from "./select-helpers.js";

/**
 * @typedef {Object<string, unknown>} Result
 */

/**
 * @typedef {Object} QueryGraph
 * @property {function(import('../query.js').RootQuery): Result} query
 */

const ID = Symbol("id");
const TYPE = Symbol("type");
const RAW = Symbol("raw");

/**
 * @param {import('../graph.js').Graph} graph
 * @returns {Object}
 */
function prepGraph(graph) {
	const data = {};
	Object.entries(graph).forEach(([resType, ressOfType]) => {
		data[resType] = {};
		Object.entries(ressOfType).forEach(([resId, res]) => {
			const defaultedRes = {
				attributes: {},
				relationships: {},
				...res,
			};

			const val = {};

			val[TYPE] = resType;
			val[ID] = resId;
			val[RAW] = {
				...defaultedRes,
				id: resId,
				resType: resType,
			};

			Object.entries(res.attributes ?? {}).forEach(([attrName, attrVal]) => {
				val[attrName] = attrVal;
			});

			Object.entries(res.relationships ?? {}).forEach(([relName, relVal]) => {
				Object.defineProperty(val, relName, {
					get() {
						const dereffed = applyOrMap(
							relVal,
							(rel) => data[rel.type][rel.id],
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

/**
 * @param {import('../query.js').NormalQuery} rootQuery
 * @param {Object} data
 * @param {Object} [options]
 * @param {import('../lib/defaults.js').SelectExpressionEngine} [options.selectEngine] - Expression engine for SELECT clauses
 * @param {import('../lib/defaults.js').WhereExpressionEngine} [options.whereEngine] - Expression engine for WHERE clauses
 * @returns {Result}
 */
function runQuery(rootQuery, data, options = {}) {
	const {
		selectEngine = defaultSelectEngine,
		whereEngine = defaultWhereEngine,
	} = options;
	const go = (query) => {
		if (query.id && !data[query.type][query.id]) return null;

		// these are in order of execution
		const operationDefinitions = {
			where(results) {
				if (Object.keys(query.where).length === 0) return results;

				return results.filter((result) =>
					whereEngine.apply(query.where, result),
				);
			},
			order(results) {
				const order = Array.isArray(query.order) ? query.order : [query.order];
				const properties = order.flatMap((o) => Object.keys(o));
				const dirs = order.flatMap((o) => Object.values(o));

				const first = results[0];
				if (first && properties.some((p) => !(p in first))) {
					const missing = properties.find((p) => !(p in first));
					throw new Error(
						`invalid "order" clause: '${missing} is not a valid attribute`,
					);
				}

				return orderBy(results, properties, dirs);
			},
			limit(results) {
				const { limit, offset = 0 } = query;
				if (limit < 1) throw new Error("`limit` must be at least 1");

				return results.slice(offset, limit + offset);
			},
			offset(results) {
				if (query.offset < 0) throw new Error("`offset` must be at least 0");
				return query.limit ? results : results.slice(query.offset);
			},
			select(results) {
				const { select } = query;
				const projectors = mapValues(select, (propQuery, propName) => {
					// possibilities: (1) property (2) expression (3) subquery
					if (typeof propQuery === "string") {
						// nested / shallow property
						const extractPath = (curValue, path) => {
							if (curValue === null) return null;
							if (path.length === 0) return curValue;

							const [head, ...tail] = path;

							if (head === "$") {
								return curValue.map((v) => extractPath(v, tail));
							}
							if (!(head in curValue)) return undefined;

							return extractPath(curValue?.[head], tail);
						};

						return (result) =>
							propQuery in result[RAW].relationships
								? result[RAW].relationships[propQuery]
								: extractPath(result, propQuery.split("."));
					}

					// expression
					if (selectEngine.isExpression(propQuery)) {
						return createExpressionProjector(propQuery, selectEngine);
					}

					// subquery
					return (result) => {
						if (result[propName] === undefined) {
							if (options.allowMissingRefs) return null;
							throw new Error(
								`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably have an invalid schema or constructed your graph wrong. Try linking the inverses (via "linkInverses"), check your schema to make sure all inverses have been defined correctly there, and make sure all resources have been loaded into the graph.`,
							);
						}

						if (Array.isArray(result[propName])) {
							return result[propName]
								.map((r) => {
									if (r === undefined) {
										if (options.allowMissingRefs) return null;

										throw new Error(
											`A related resource was not found on resource ${
												query.type
											}.${query.id}.${propName}. Check that all of the relationship refs in ${
												query.type
											}.${query.id} are valid.`,
										);
									}

									return go({ ...propQuery, type: r[TYPE], id: r[ID] });
								})
								.filter(Boolean);
						}

						if (result[propName] === undefined) {
							if (options.allowMissingRefs) return null;

							throw new Error(
								`A related resource was not found on resource ${query.type}.${
									query.id
								}. ${propName}: ${JSON.stringify(
									result[RAW].relationships[propName],
								)}. Check that all of the relationship refs in ${query.type}.${
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

/**
 * @param {import('../schema.js').Schema} schema
 * @param {import('../query.js').RootQuery} query
 * @param {import('../graph.js').Graph} graph
 * @param {Object} [options]
 * @param {import('../lib/defaults.js').SelectExpressionEngine} [options.selectEngine] - Expression engine for SELECT clauses
 * @param {import('../lib/defaults.js').WhereExpressionEngine} [options.whereEngine] - Expression engine for WHERE clauses
 * @returns {Result}
 */
export function queryGraph(schema, query, graph, options = {}) {
	const preppedGraph = prepGraph(graph);
	const normalQuery = normalizeQuery(schema, query, options);

	return runQuery(normalQuery, preppedGraph, options);
}
