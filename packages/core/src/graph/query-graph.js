import { applyOrMap } from "@spectragraph/utils";
import { normalizeQuery } from "../query/normalize-query.js";
import { createQueryGraphClauses } from "./query-graph-clauses.js";

/**
 * @typedef {Object<string, unknown>} Result
 */

/**
 * @typedef {Object} QueryGraph
 * @property {function(import('../query.js').RootQuery): Result} query
 */

export const ID = Symbol("id");
export const TYPE = Symbol("type");
export const RAW = Symbol("raw");

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
function runQuery(schema, rootQuery, data, options = {}) {
	const processSubquery = (query) => {
		if (query.id && !data[query.type][query.id]) return null;

		// these are in order of execution
		const operationDefinitions = createQueryGraphClauses(
			schema,
			query,
			processSubquery,
			options,
		);

		const results = query.id
			? [data[query.type][query.id]]
			: Object.values(data[query.type]);

		const hasClause = (opName) =>
			opName === "limit" || opName === "offset"
				? query.slice?.[opName] !== undefined
				: opName in query;
		const processed = Object.entries(operationDefinitions).reduce(
			(acc, [opName, fn]) => (hasClause(opName) ? fn(acc) : acc),
			results,
		);

		return query.id ? processed[0] : processed;
	};

	return processSubquery(rootQuery);
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

	return runQuery(schema, normalQuery, preppedGraph, options);
}
