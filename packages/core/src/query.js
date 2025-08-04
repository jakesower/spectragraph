import { defaultExpressionEngine } from "@data-prism/expressions";
import { mapValues, omit } from "lodash-es";

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
 * Validates that a query is valid against the schema
 * @param {Object} schema - The schema object
 * @param {RootQuery} query - The query to validate
 * @throws {Error} If the query is invalid
 */
export function ensureValidQuery(schema, query) {
	const go = (subquery, info) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];
		const pathStr = `#/${path.join(".select.")}`;

		const propertyValidators = {
			id: () => {
				if (path.length > 0) {
					throw new Error(
						`[invalid query] [${pathStr}.id] id is only allowed on the root query`,
					);
				}
			},
			limit: (limit) => {
				if (typeof limit !== "number" || limit < 1) {
					throw new Error(
						`[invalid query] [${pathStr}.limit] offset must be number that's at least 0`,
					);
				}
			},
			offset: (offset) => {
				if (typeof offset !== "number" || offset < 0) {
					throw new Error(
						`[invalid query] [${pathStr}.offset] offset must be number that's at least 0`,
					);
				}
			},
			order: (order) => {
				const checkItem = (item) => {
					if (Object.keys(item).length !== 1) {
						throw new Error(
							`[invalid query] [${pathStr}.order] objects must have exactly one key`,
						);
					}

					const [prop, dir] = Object.entries(item)[0];
					if (!["asc", "desc"].includes(dir)) {
						throw new Error(
							`[invalid query] [${pathStr}.order] objects have values of "asc" or "desc"`,
						);
					}

					if (!Object.keys(resourceSchema.attributes).includes(prop)) {
						throw new Error(
							`[invalid query] [${pathStr}.order] "${prop}" is not a valid attribute and cannot be ordered on`,
						);
					}
				};

				Array.isArray(order) ? order.forEach(checkItem) : checkItem(order);
			},
			where: (where) => {
				if (typeof where !== "object") {
					throw new Error(
						`[invalid query] [${pathStr}.where] must be an object`,
					);
				}
			},
			select: (select) => {
				const validateObject = (obj) => {
					Object.entries(obj).forEach(([key, val]) => {
						if (defaultExpressionEngine.isExpression(val)) return;
						if (key === "*") return;

						if (
							typeof val === "string" &&
							!Object.keys(resourceSchema.attributes).includes(val) &&
							!Object.keys(resourceSchema.relationships).includes(val)
						) {
							throw new Error(
								`[invalid query] [${pathStr}.select.${key}] ${val} is an invalid string property (did you misspell an attribute name?)`,
							);
						}

						if (key in Object.keys(resourceSchema.relationships)) {
							if (typeof val !== "object" || Array.isArray(val)) {
								throw new Error(
									`[invalid query] [${pathStr}.select.${key}] ${val} is the name of a relationship and must supply a subquery as its value`,
								);
							}

							go(val, {
								path: [...path, key],
								type: resourceSchema.relationships[key].type,
							});
						}
					});
				};

				if (select === "*") return;

				if (Array.isArray(select)) {
					select.forEach((val, idx) => {
						if (
							typeof val === "string" &&
							!Object.keys(resourceSchema.attributes).includes(val) &&
							!Object.keys(resourceSchema.relationships).includes(val)
						) {
							throw new Error(
								`[invalid query] [${pathStr}.select[${idx}]] ${val} is an invalid string property (did you misspell an attribute name?)`,
							);
						} else if (typeof val === "object") validateObject(val);
					});
				} else if (typeof select === "object") validateObject(select);
				else {
					throw new Error(
						`[invalid query] [${pathStr}.select] select queries must be arrays, object, or the "*" string`,
					);
				}
			},
		};

		if (!("select" in subquery)) {
			throw new Error(
				`[invalid query] [${pathStr}] queries must have a select clause`,
			);
		}

		mapValues(subquery, (v, k) => {
			if (propertyValidators[k]) propertyValidators[k](v);
		});
	};

	if (typeof query !== "object" || Array.isArray(query))
		throw new Error("queries must be objects");

	if (!query.type)
		throw new Error("root queries must be objects and have a `type`");

	if (!Object.keys(schema.resources).includes(query.type))
		throw new Error(`${query.type} is not a valid query type`);

	const initInfo = {
		path: [],
		parent: null,
		type: query.type,
	};

	go(query, initInfo);
}

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalRootQuery} The normalized query
 */
export function normalizeQuery(schema, rootQuery) {
	ensureValidQuery(schema, rootQuery);

	const stringToProp = (str) => ({
		[str]: str,
	});

	const go = (query, type) => {
		const { select } = query;

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
