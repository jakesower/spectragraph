import { partition, pick } from "lodash-es";

/**
 * @typedef {Object} QueryBreakdownItem
 * @property {string[]} path - Path to this query level
 * @property {any} attributes - Selected attributes
 * @property {any} relationships - Selected relationships
 * @property {string} type - Resource type
 * @property {import('data-prism').Query} query - The query object
 * @property {boolean} ref - Whether this is a reference-only query
 * @property {import('data-prism').Query|null} parentQuery - Parent query if any
 * @property {QueryBreakdownItem|null} parent - Parent breakdown item if any
 * @property {string|null} parentRelationship - Parent relationship name if any
 */

/**
 * @typedef {QueryBreakdownItem[]} QueryBreakdown
 */

/**
 * Flattens a nested query into a linear array of query breakdown items
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} rootQuery - The root query to flatten
 * @returns {QueryBreakdown} Flattened query breakdown
 */
export function flattenQuery(schema, rootQuery) {
	const go = (
		query,
		type,
		path,
		parent = null,
		parentRelationship = null,
	) => {
		const resDef = schema.resources[type];
		const { idAttribute = "id" } = resDef;
		const [attributesEntries, relationshipsEntries] = partition(
			Object.entries(query.select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" &&
				(propVal in resDef.attributes || propVal === idAttribute),
		);

		const attributes = attributesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			attributes,
			query,
			ref: !query.select,
			relationships: pick(query.select, relationshipKeys),
			type,
		};

		return [
			level,
			...relationshipKeys.flatMap((relKey) => {
				const relDef = resDef.relationships[relKey];
				const subquery = query.select[relKey];

				return go(subquery, relDef.type, [...path, relKey], level, relKey);
			}),
		];
	};

	return go(rootQuery, rootQuery.type, []);
}

/**
 * Maps over each query in a flattened query structure
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The root query
 * @param {(query: import('data-prism').Query, info: QueryBreakdownItem) => any} fn - Mapping function
 * @returns {any[]} Mapped results
 */
export function flatMapQuery(schema, query, fn) {
	return flattenQuery(schema, query).flatMap((info) => fn(info.query, info));
}

/**
 * Iterates over each query in a flattened query structure
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The root query
 * @param {(query: import('data-prism').Query, info: QueryBreakdownItem) => void} fn - Iteration function
 */
export function forEachQuery(schema, query, fn) {
	return flattenQuery(schema, query).forEach((info) => fn(info.query, info));
}

/**
 * Reduces over each query in a flattened query structure
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The root query
 * @param {(acc: any, query: import('data-prism').Query, info: QueryBreakdownItem) => any} fn - Reducer function
 * @param {any} initVal - Initial value
 * @returns {any} Reduced result
 */
export function reduceQuery(schema, query, fn, initVal) {
	return flattenQuery(schema, query).reduce(
		(acc, q) => fn(acc, q.query, q),
		initVal,
	);
}

/**
 * Tests whether some query in a flattened query structure matches a condition
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The root query
 * @param {(query: import('data-prism').Query, info: QueryBreakdownItem) => boolean} fn - Test function
 * @returns {boolean} Whether any query matches the condition
 */
export function someQuery(schema, query, fn) {
	return flattenQuery(schema, query).some((q) => fn(q.query, q));
}