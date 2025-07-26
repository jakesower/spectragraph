import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit, pick } from "lodash-es";

/**
 * @typedef {Object} Expression
 * @property {*} [key] - Dynamic expression properties
 */

/**
 * @typedef {Object} Query
 * @property {string} [id]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object|Object[]} [order] - Single order object or array of order objects
 * @property {Array|Object|string} select - Select clause: array, object, or "*"
 * @property {string} [type]
 * @property {Object} [where] - Where conditions
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
 */

/**
 * @typedef {RootQuery & NormalQuery} NormalRootQuery
 */

/**
 * @typedef {Object} QueryInfo
 * @property {string[]} path
 * @property {Query|null} parent
 * @property {string} type
 */

const { isExpression } = defaultExpressionEngine;

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalRootQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery) {
	const stringToProp = (str) => ({
		[str]: str,
	});

	const go = (query, type) => {
		const { select } = query;

		if (!select) throw new Error("queries must have a `select` clause");

		const selectWithExpandedStar =
			select === "*" ? Object.keys(schema.resources[type].attributes) : select;

		const selectObj = Array.isArray(selectWithExpandedStar)
			? selectWithExpandedStar.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const selectWithStar = selectObj["*"]
			? {
					...Object.keys(schema.resources[type].attributes).reduce(
						(acc, attr) => ({ ...acc, ...stringToProp(attr) }),
						{},
					),
					...omit(selectObj, ["*"]),
				}
			: selectObj;

		const selectWithSubqueries = mapValues(selectWithStar, (sel, key) => {
			if (
				key in schema.resources[type].relationships &&
				typeof sel === "object"
			) {
				const relType = schema.resources[type].relationships[key].type;
				return go(sel, relType);
			}
			return sel;
		});

		const orderObj = query.order
			? { order: !Array.isArray(query.order) ? [query.order] : query.order }
			: {};

		return {
			...query,
			select: selectWithSubqueries,
			type,
			...orderObj,
		};
	};

	return go(rootQuery, rootQuery.type);
}

/**
 * Iterates over each subquery in a query tree
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The root query
 * @param {Function} fn - Function to call for each subquery
 */
export function forEachQuery(schema, query, fn) {
	const go = (subquery, info) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		);

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

				go(select, nextInfo);
			}
		});
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	go(normalizeQuery(schema, query), initInfo);
}

/**
 * Maps over each subquery in a query tree, transforming them
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The root query
 * @param {Function} fn - Function to transform each subquery
 * @returns {*} The transformed query result
 */
export function mapQuery(schema, query, fn) {
	const go = (subquery, info) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		);

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

			return go(select, nextInfo);
		});

		return fn({ ...subquery, select: mappedSelect }, fullInfo);
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	return go(normalizeQuery(schema, query), initInfo);
}

/**
 * Reduces over each subquery in a query tree
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The root query
 * @param {Function} fn - Reducer function
 * @param {*} init - Initial accumulator value
 * @returns {*} The reduced result
 */
export function reduceQuery(schema, query, fn, init) {
	const go = (subquery, info, accValue) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		);

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

				return go(select, nextInfo, acc);
			},
			fn(accValue, subquery, fullInfo),
		);
	};

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	return go(normalizeQuery(schema, query), initInfo, init);
}

/**
 * Validates that a query is valid against the schema
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @throws {Error} If the query is invalid
 */
export function ensureValidQuery(schema, query) {
	if (!query.type) throw new Error("root queries must have a `type`");

	const hasValidPath = (curType, remainingPath) => {
		if (remainingPath.length === 0) return true;

		const [head, ...tail] = remainingPath;
		if (tail.length === 0) return head in schema.resources[curType].attributes;

		const rel = schema.resources[curType].relationships[head];
		if (!rel) return false;

		return hasValidPath(rel.type, tail);
	};

	forEachQuery(schema, query, (subquery, info) => {
		Object.entries(subquery.where ?? {}).forEach(([whereKey, whereVal]) => {
			// TODO: Distribute $and, $or, and $not

			if (
				!defaultExpressionEngine.isExpression({ [whereKey]: whereVal }) &&
				!hasValidPath(info.type, whereKey.split("."))
			) {
				throw new Error(
					`"${whereKey}" is not a valid attribute or path to filter on for the "${info.type}" resource type`,
				);
			}
		});
	});
}