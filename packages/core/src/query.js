import { pick } from "es-toolkit";
import { normalizeQuery } from "./query/normalize-query.js";
import { validateQuery } from "./query/validate-query.js";

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

function looksLikeExpression(val) {
	return (
		val !== null &&
		typeof val === "object" &&
		!Array.isArray(val) &&
		Object.keys(val).length === 1 &&
		Object.keys(val)[0].startsWith("$")
	);
}

const propHandler = (operand) => ({ paths: [[operand]], traverse: [operand] });

const matchesHandler = (operand, { apply }) => ({
	paths: Object.entries(operand).flatMap(([key, val]) => [
		[key],
		...apply(val).paths.map((v) => [key, ...v]),
	]),
});

const resolveStringOrExpression = (strOrExprs, apply) => ({
	paths: [
		strOrExprs.flatMap((strOrExpr) =>
			typeof strOrExpr === "string" ? strOrExpr : apply(strOrExpr).paths,
		),
	],
});

const extendExpandingExpressions = {
	$literal: () => ({ paths: [] }),
	$get: (operand) => {
		const asArray = Array.isArray(operand) ? operand : operand.split(/\./);
		const filtered = asArray.filter((part) => part !== "$");
		return {
			paths: [filtered],
			traverse: filtered,
		};
	},
	$prop: propHandler,
	$exists: propHandler,
	$matchesAll: matchesHandler,
	$matchesAny: matchesHandler,
	$filterBy: matchesHandler,
	$pluck: propHandler,
	$pipe: (operand, { apply }) => {
		const walk = ({ paths, traverse }, step) => {
			const stepResult = apply(step);
			return {
				paths: [
					...paths,
					...stepResult.paths.map((resPath) => [...traverse, ...resPath]),
				],
				traverse: stepResult.traverse
					? [...traverse, ...stepResult.traverse]
					: traverse,
			};
		};

		return operand.reduce(walk, { paths: [], traverse: [] });
	},
	$sort: (operand, { apply }) => {
		const normal =
			typeof operand === "string"
				? [operand]
				: Array.isArray(operand.by)
					? operand.by
					: [operand.by];

		return resolveStringOrExpression(normal, apply);
	},
	$groupBy: (operand, { apply }) => {
		const normal = Array.isArray(operand) ? operand : [operand];
		return resolveStringOrExpression(normal, apply);
	},
};

const extractQuerySelection = (selection) => {
	if (Array.isArray(selection)) {
		return {
			paths: selection.flatMap((sel) => extractQuerySelection(sel).paths),
		};
	} else if (looksLikeExpression(selection)) {
		const [exprName, operand] = Object.entries(selection)[0];
		return extendExpandingExpressions[exprName]
			? extendExpandingExpressions[exprName](operand, {
					apply: extractQuerySelection,
				})
			: pick(extractQuerySelection(operand), ["paths"]);
	} else if (typeof selection === "object" && selection !== null) {
		return {
			paths: Object.values(selection).flatMap(
				(sel) => extractQuerySelection(sel).paths,
			),
		};
	} else {
		return { paths: [] };
	}
};

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
 * @param {NormalQuery} normalQuery - The normalized query to analyze (use normalizeQuery first)
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
 * @note Only analyzes the select clause - does not include paths referenced in where/order clauses
 */
export function getQueryExtent(schema, normalQuery) {
	const pathSet = new Set();

	const walk = (query, path) => {
		Object.entries(query.select).forEach(([key, val]) => {
			if (key in schema.resources[query.type].relationships) {
				walk(val, [...path, key]);
			} else if (looksLikeExpression(val)) {
				extractQuerySelection(val).paths.forEach((exprPath) => {
					pathSet.add([...path, ...exprPath].join("."));
				});
			} else {
				pathSet.add([...path, val].join("."));
			}
		});
	};

	walk(normalQuery, []);
	return Array.from(pathSet);
}

export { normalizeQuery, validateQuery };
