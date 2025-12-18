import { getFullQueryExtent } from "./query/query-extent.js";
import { normalizeQuery } from "./query/normalize-query.js";
import { validateQuery } from "./query/validate-query.js";
import { looksLikeExpression } from "./lib/helpers.js";
import { extractQuerySelection } from "./query/helpers.js";

/**
 * @typedef {Object} Expression
 * @property {*} [key] - Dynamic expression properties
 */

/**
 * @typedef {Object} Query
 * @property {string} [id] - Fetch a single resource by ID (mutually exclusive with ids)
 * @property {string[]} [ids] - Fetch multiple resources by IDs (mutually exclusive with id)
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object|Object[]} [order] - Single order object or array of order objects
 * @property {Array|Object|string} select - Select clause: array, object, or "*"
 * @property {string} [type]
 * @property {Object} [where] - Where conditions
 * @property {*} [meta] - User information about the query ignored by SpectraGraph
 */

/**
 * @typedef {Query} RootQuery
 * @property {string} type - Required type for root queries
 */

/**
 * @typedef {Query} NormalQuery
 * @property {Object} select - Normalized select object
 * @property {Object[]} [order] - Array of order objects
 * @property {string} type - Required type
 * @property {Object} relationships - The selected relationships
 * @property {Object} values - Selected scalar values (non relationships)
 */

/**
 * Calculates the statically determinable extent (required attributes and relationships) of a query.
 * Returns an array of dot-notated paths representing all attributes and relationships that must be
 * accessed to fulfill the query's select clause.
 *
 * This is useful for store implementations to optimize data fetching by:
 * - Determining which database columns to SELECT in SQL queries
 * - Knowing which API endpoints/fields to fetch in multi-API stores
 * - Building minimal GraphQL queries
 * - Validating access permissions for specific paths
 *
 * @param {Schema} schema - The schema defining resource types and relationships
 * @param {Query} query - The normalized query to analyze (use normalizeQuery first)
 * @returns {string[]} Array of unique dot-notated paths (e.g., ["name", "home.name", "powers.wielders.name"])
 *
 * @example
 * ```javascript
 * const query = normalizeQuery(schema, {
 *   type: "bears",
 *   select: {
 *     name: "name",
 *     powerNames: { $get: "powers.$.name" },
 *     home: { select: { name: "name" } }
 *   }
 * });
 *
 * const extent = getQueryExtent(schema, query);
 * // Returns: ["name", "powers.name", "home.name"]
 * ```
 *
 * @note Does not analyze dynamically constructed paths (e.g., { $get: { $concat: ["home", ".name"] } })
 * @note Only analyzes the select and group clauses - does not include paths referenced in where/order clauses
 */
export function getQueryExtent(schema, query) {
	const normalQuery = normalizeQuery(schema, query);
	const pathSet = new Set();

	const walkSelect = (query, path) => {
		Object.entries(query.select).forEach(([key, val]) => {
			if (key in schema.resources[query.type].relationships) {
				walkSelect(val, [...path, key]);
			} else if (looksLikeExpression(val)) {
				extractQuerySelection(val).paths.forEach((exprPath) => {
					pathSet.add([...path, ...exprPath].join("."));
				});
			} else {
				pathSet.add([...path, val].join("."));
			}
		});
	};

	const walkGroup = (query) => {
		const { by, aggregates = {} } = query.group;
		by.forEach((val) => {
			pathSet.add(val);
		});

		Object.values(aggregates).forEach((agg) => {
			if (looksLikeExpression(agg)) {
				extractQuerySelection(agg).paths.forEach((exprPath) => {
					pathSet.add(exprPath.join("."));
				});
			}
		});
	};

	if (normalQuery.select) {
		walkSelect(normalQuery, []);
	} else {
		walkGroup(normalQuery);
	}

	return Array.from(pathSet);
}

export { getFullQueryExtent, normalizeQuery, validateQuery };
