'use strict';

var expressions = require('@data-prism/expressions');
var lodashEs = require('lodash-es');
var utils = require('@data-prism/utils');
var Ajv = require('ajv');
var uuid = require('uuid');
var addFormats = require('ajv-formats');

/**
 * @typedef {Object} SchemaAttribute
 * @property {"object"|"array"|"boolean"|"string"|"number"|"integer"|"null"|"date"|"time"|"date-time"|"iso-time"|"iso-date-time"|"duration"|"uri"|"uri-reference"|"uri-template"|"url"|"email"|"hostname"|"ipv4"|"ipv6"|"regex"|"uuid"|"json-pointer"|"relative-json-pointer"|"byte"|"int32"|"int64"|"float"|"double"|"password"|"binary"|"data-prism:geojson"|"data-prism:geojson-point"} type
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [default]
 * @property {string} [$comment]
 * @property {boolean} [deprecated]
 * @property {*} [meta]
 * @property {boolean} [required]
 * @property {string} [subType]
 */

/**
 * @typedef {Object} SchemaRelationship
 * @property {string} type
 * @property {"one"|"many"} cardinality
 * @property {string} [inverse]
 * @property {boolean} [required]
 */

/**
 * @typedef {Object} SchemaResource
 * @property {string} [idAttribute]
 * @property {Object<string, SchemaAttribute>} attributes
 * @property {Object<string, SchemaRelationship>} relationships
 */

/**
 * @typedef {Object} Schema
 * @property {string} [$schema]
 * @property {string} [$id]
 * @property {string} [title]
 * @property {string} [description]
 * @property {*} [meta]
 * @property {string} [version]
 * @property {Object<string, SchemaResource>} resources
 */

const attributeTypes = [
	"object",
	"array",
	"boolean",
	"string",
	"number",
	"integer",
	"null",
	"date",
	"time",
	"date-time",
	"iso-time",
	"iso-date-time",
	"duration",
	"uri",
	"uri-reference",
	"uri-template",
	"url",
	"email",
	"hostname",
	"ipv4",
	"ipv6",
	"regex",
	"uuid",
	"json-pointer",
	"relative-json-pointer",
	"byte",
	"int32",
	"int64",
	"float",
	"double",
	"password",
	"binary",
	"data-prism:geojson",
	"data-prism:geojson-point",
];

/**
 * Validates that a schema is valid
 * @param {*} schema - The schema to validate
 * @throws {Error} If the schema is invalid
 */
function ensureValidSchema(schema) {
	if (typeof schema !== "object") {
		throw new Error("The schema must be an object.");
	}

	if (!("resources" in schema) || Array.isArray(schema.resources)) {
		throw new Error(
			'Invalid schema. The schema must have a "resources" object with valid resources as values.',
		);
	}

	Object.entries(schema.resources).forEach(([resKey, resource]) => {
		if (!("attributes" in resource) || Array.isArray(resource.attributes)) {
			throw new Error(
				`Invalid schema. Each schema resource must have an "attributes" object with valid resource attributes as values. Check the "${resKey}" resource.`,
			);
		}

		const idAttribute = resource.idAttribute ?? "id";
		if (!(idAttribute in resource.attributes)) {
			throw new Error(
				`Invalid schema. An id attribute is required. Please ensure the "${idAttribute}" attribute is defined on resource type "${resKey}".`,
			);
		}

		Object.entries(resource.attributes).forEach(
			([attrKey, attribute]) => {
				if (!attribute.type) {
					throw new Error(
						`Invalid schema. All attributes must have a type. Check the "${attrKey}" attribute on the "${resKey}" resource type.`,
					);
				}

				if (!attributeTypes.includes(attribute.type)) {
					throw new Error(
						`Invalid schema. "${attribute.type}" is not a valid type. Check the "${attrKey}" attribute on the "${resKey}" resource type. Valid types: ${attributeTypes.join(", ")}.`,
					);
				}
			},
		);

		if (
			!("relationships" in resource) ||
			Array.isArray(resource.relationships)
		) {
			throw new Error(
				`Invalid schema. Each schema resource must have an "relationships" object with valid resource relationships as values. Check the "${resKey}" resource.`,
			);
		}

		Object.entries(resource.relationships).forEach(
			([relKey, relationship]) => {
				if (!relationship.cardinality || !relationship.type) {
					throw new Error(
						`Invalid schema. All relationships must have a cardinality or a type. Check the "${relKey}" relationship on the "${resKey}" resource type.`,
					);
				}

				if (
					relationship.cardinality !== "one" &&
					relationship.cardinality !== "many"
				) {
					throw new Error(
						`Invalid schema. Relationship cardinality must be either "one" or "many". Check the "${relKey}" relationship on the "${resKey}" resource type.`,
					);
				}

				if (!Object.keys(schema.resources).includes(relationship.type)) {
					throw new Error(
						`Invalid schema. "${relationship.type}" is not a valid relationship type. Relationship types must be a type of resource defined in the schema. Check the "${relKey}" relationship on the "${resKey}" resource type. Valid resource type: ${Object.keys(schema.resources).join(", ")}`,
					);
				}
			},
		);
	});
}

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

const { isExpression: isExpression$1 } = expressions.defaultExpressionEngine;

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param {Object} schema - The schema object
 * @param {RootQuery} rootQuery - The query to normalize
 * @returns {NormalRootQuery} The normalized query
 */
function normalizeQuery(schema, rootQuery) {
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
					...lodashEs.omit(selectObj, ["*"]),
				}
			: selectObj;

		const selectWithSubqueries = lodashEs.mapValues(selectWithStar, (sel, key) => {
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
function forEachQuery(schema, query, fn) {
	const go = (subquery, info) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = lodashEs.pick(
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
			if (typeof select === "object" && !isExpression$1(select)) {
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
function mapQuery(schema, query, fn) {
	const go = (subquery, info) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = lodashEs.pick(
			subquery.select,
			Object.keys(resourceSchema.relationships),
		);

		const fullInfo = {
			...info,
			attributes,
			relationships,
		};

		const mappedSelect = lodashEs.mapValues(subquery.select, (select, prop) => {
			if (typeof select !== "object" || isExpression$1(select)) return select;

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
function reduceQuery(schema, query, fn, init) {
	const go = (subquery, info, accValue) => {
		const { path, type } = info;
		const resourceSchema = schema.resources[type];

		const attributes = Object.keys(resourceSchema.attributes).filter((a) =>
			Object.values(subquery.select).includes(a),
		);
		const relationships = lodashEs.pick(
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
				if (typeof select !== "object" || isExpression$1(select)) return acc;

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
function ensureValidQuery(schema, query) {
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
				!expressions.defaultExpressionEngine.isExpression({ [whereKey]: whereVal }) &&
				!hasValidPath(info.type, whereKey.split("."))
			) {
				throw new Error(
					`"${whereKey}" is not a valid attribute or path to filter on for the "${info.type}" resource type`,
				);
			}
		});
	});
}

/**
 * @typedef {Object<string, unknown>} Expression
 */

/**
 * @typedef {Object} SchemalessQuery
 * @property {string} [id]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {Object<string, "asc" | "desc"> | Object<string, "asc" | "desc">[]} [order]
 * @property {readonly (string | Object<string, string | SchemalessQuery | Expression>)[] | Object<string, string | SchemalessQuery | Expression>} select
 * @property {string} [type]
 * @property {Object<string, unknown>} [where]
 */

/**
 * @typedef {SchemalessQuery & { type: string }} RootSchemalessQuery
 */

/**
 * @typedef {SchemalessQuery & {
 *   select: Object<string, string | NormalSchemalessQuery | Expression>,
 *   order?: Object<string, "asc" | "desc">[]
 * }} NormalSchemalessQuery
 */

/**
 * @typedef {RootSchemalessQuery & NormalSchemalessQuery} NormalRootSchemalessQuery
 */

/**
 * @typedef {Object} SchemalessQueryInfo
 * @property {string[]} path
 * @property {SchemalessQuery | null} parent
 */

const { isExpression } = expressions.defaultExpressionEngine;

/**
 * @param {RootSchemalessQuery} rootSchemalessQuery
 * @returns {NormalRootSchemalessQuery}
 */
function normalizeSchemalessQuery(
	rootSchemalessQuery,
) {
	const stringToProp = (str) => ({ [str]: str });

	const go = (query) => {
		const { select } = query;

		if (!select) throw new Error("queries must have a `select` clause");

		const selectObj = Array.isArray(select)
			? select.reduce((selectObj, item) => {
					const subObj = typeof item === "string" ? stringToProp(item) : item;
					return { ...selectObj, ...subObj };
				}, {})
			: select;

		const subqueries = lodashEs.mapValues(selectObj, (sel) =>
			typeof sel === "object" && !isExpression(sel) ? go(sel) : sel,
		);

		const orderObj = query.order
			? { order: !Array.isArray(query.order) ? [query.order] : query.order }
			: {};

		return {
			...query,
			select: subqueries,
			...orderObj,
		};
	};

	return go(rootSchemalessQuery);
}

/**
 * @param {SchemalessQuery} query
 * @param {function(SchemalessQuery, SchemalessQueryInfo): void} fn
 */
function forEachSchemalessQuery(query, fn) {
	const go = (subquery, info) => {
		fn(subquery, info);

		Object.entries(subquery.select).forEach(([prop, select]) => {
			if (typeof select === "object" && !isExpression(select)) {
				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				go(select, nextInfo);
			}
		});
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	go(normalizeSchemalessQuery(query), initInfo);
}

/**
 * @param {SchemalessQuery} query
 * @param {function(SchemalessQuery, SchemalessQueryInfo): SchemalessQuery} fn
 * @returns {SchemalessQuery}
 */
function mapSchemalessQuery(query, fn) {
	const go = (subquery, info) => {
		const mappedSelect = lodashEs.mapValues(subquery.select, (select, prop) => {
			if (typeof select !== "object" || isExpression(select)) return select;

			const nextInfo = {
				path: [...info.path, prop],
				parent: subquery,
			};

			return go(select, nextInfo);
		});

		return fn({ ...subquery, select: mappedSelect }, info);
	};

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeSchemalessQuery(query), initInfo);
}

/**
 * @template T
 * @param {SchemalessQuery} query
 * @param {function(T, SchemalessQuery, SchemalessQueryInfo): T} fn
 * @param {T} init
 * @returns {T}
 */
function reduceSchemalessQuery(query, fn, init) {
	const go = (subquery, info, accValue) =>
		Object.entries(subquery.select).reduce(
			(acc, [prop, select]) => {
				if (typeof select !== "object" || isExpression(select)) return acc;

				const nextInfo = {
					path: [...info.path, prop],
					parent: subquery,
				};

				return go(select, nextInfo, acc);
			},
			fn(accValue, subquery, info),
		);

	const initInfo = {
		path: [],
		parent: null,
	};

	return go(normalizeSchemalessQuery(query), initInfo, init);
}

/**
 * @param {Object} whereClause
 * @param {any} expressionEngine
 * @returns {any}
 */
function buildWhereExpression(whereClause, expressionEngine) {
	if (expressionEngine.isExpression(whereClause)) {
		/** @type {[string, any]} */
		const [name, params] = Object.entries(whereClause)[0];
		const built = Array.isArray(params)
			? params.map((p) => buildWhereExpression(p, expressionEngine))
			: buildWhereExpression(params, expressionEngine);

		return { [name]: built };
	}

	const whereExpressions = Object.entries(whereClause).map(
		([propPath, propVal]) => ({
			$pipe: [
				{ $get: propPath },
				expressionEngine.isExpression(propVal) ? propVal : { $eq: propVal },
			],
		}),
	);

	return whereExpressions.length > 1
		? { $and: whereExpressions }
		: whereExpressions[0];
}

/**
 * @typedef {Object<string, any>} Projection
 */

const TERMINAL_EXPRESSIONS = ["$get", "$prop", "$literal"];

/**
 * @param {any} expression
 * @param {any} expressionEngine
 * @returns {any}
 */
function distributeStrings(expression, expressionEngine) {
	const { isExpression } = expressionEngine;

	if (typeof expression === "string") {
		const [iteratee, ...rest] = expression.split(".$.");
		if (rest.length === 0) return { $get: expression };

		return {
			$pipe: [
				{ $get: iteratee },
				{ $flatMap: distributeStrings(rest.join(".$."), expressionEngine) },
				{ $filter: { $defined: {} } },
			],
		};
	}

	if (!isExpression(expression)) {
		return Array.isArray(expression)
			? expression.map(distributeStrings)
			: typeof expression === "object"
				? lodashEs.mapValues(expression, distributeStrings)
				: expression;
	}

	const [expressionName, expressionArgs] = Object.entries(expression)[0];

	return TERMINAL_EXPRESSIONS.includes(expressionName)
		? expression
		: { [expressionName]: distributeStrings(expressionArgs, expressionEngine) };
}

/**
 * @param {import('@data-prism/expressions').Expression} expression
 * @param {any} expressionEngine
 * @returns {function(any): any}
 */
function createExpressionProjector(
	expression,
	expressionEngine,
) {
	const { apply } = expressionEngine;
	const expr = distributeStrings(expression, expressionEngine);

	return (result) => apply(expr, result);
}

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
 * @param {import('../graph.js').Graph} resources
 * @returns {Object}
 */
function prepData(resources) {
	const data = {};
	Object.entries(resources).forEach(([resType, ressOfType]) => {
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
						const dereffed = utils.applyOrMap(
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
 * @param {import('../query.js').NormalRootQuery} rootQuery
 * @param {Object} data
 * @returns {Result}
 */
function runQuery(
	rootQuery,
	data,
) {
	const go = (query) => {
		if (query.id && !data[query.type][query.id]) return null;

		// these are in order of execution
		const operationDefinitions = {
			/**
			 * @param {unknown[]} results
			 * @returns {unknown[]}
			 */
			where(results) {
				if (Object.keys(query.where).length === 0) return results;

				const whereExpression = buildWhereExpression(
					query.where,
					expressions.defaultExpressionEngine,
				);

				return results.filter((result) => {
					return expressions.defaultExpressionEngine.apply(whereExpression, result);
				});
			},
			/**
			 * @param {unknown[]} results
			 * @returns {unknown[]}
			 */
			order(results) {
				const order = Array.isArray(query.order) ? query.order : [query.order];
				const properties = order.flatMap((o) => Object.keys(o));
				const dirs = order.flatMap((o) => Object.values(o));

				/** @type {Object<string, unknown>} */
				const first = results[0];
				if (first && properties.some((p) => !(p in first))) {
					const missing = properties.find((p) => !(p in first));
					throw new Error(
						`invalid "order" clause: '${missing} is not a valid attribute`,
					);
				}

				return lodashEs.orderBy(results, properties, dirs);
			},
			/**
			 * @param {unknown[]} results
			 * @returns {unknown[]}
			 */
			limit(results) {
				const { limit, offset = 0 } = query;
				if (limit < 1) throw new Error("`limit` must be at least 1");

				return results.slice(offset, limit + offset);
			},
			/**
			 * @param {unknown[]} results
			 * @returns {unknown[]}
			 */
			offset(results) {
				if (query.offset < 0) throw new Error("`offset` must be at least 0");
				return query.limit ? results : results.slice(query.offset);
			},
			select(results) {
				const { select } = query;
				const projectors = lodashEs.mapValues(select, (propQuery, propName) => {
					// possibilities: (1) property (2) expression (3) subquery
					if (typeof propQuery === "string") {
						// nested / shallow property
						const extractPath = (curValue, path) => {
							if (curValue === null) return null;
							if (path.length === 0) return curValue;

							const [head, ...tail] = path;

							if (head === "$")
								return curValue.map((v) => extractPath(v, tail));

							if (!(head in curValue))
								return undefined;

							return extractPath(curValue?.[head], tail);
						};

						return (result) =>
							propQuery in result[RAW].relationships
								? result[RAW].relationships[propQuery]
								: extractPath(result, propQuery.split("."));
					}

					// expression
					if (expressions.defaultExpressionEngine.isExpression(propQuery)) {
						return createExpressionProjector(
							propQuery,
							expressions.defaultExpressionEngine,
						);
					}

					// subquery
					return (result) => {
						if (result[propName] === undefined) {
							throw new Error(
								`The "${propName}" relationship is undefined on a resource of type "${query.type}". You probably have an invalid schema or constructed your graph wrong. Try linking the inverses (via "linkInverses"), check your schema to make sure all inverses have been defined correctly there, and make sure all resources have been loaded into the graph.`,
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
											)}. Check that all of the relationship refs in ${
												query.type
											}.${query.id} are valid.`,
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
					lodashEs.mapValues(projectors, (project) => project(result)),
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
 * @param {import('../graph.js').Graph} graph
 * @returns {QueryGraph}
 */
function createQueryGraph(graph) {
	const data = prepData(graph);

	return {
		query(query) {
			const compiled = normalizeSchemalessQuery(query);
			return runQuery(compiled, data);
		},
	};
}

/**
 * @param {import('../graph.js').Graph} graph
 * @param {import('../query.js').RootQuery} query
 * @returns {Result}
 */
function queryGraph(
	graph,
	query,
) {
	return createQueryGraph(graph).query(query);
}

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} NormalResource
 * @property {string} id
 * @property {string} type
 * @property {Object<string, *>} attributes
 * @property {Object<string, Ref|Ref[]|null>} relationships
 */

/**
 * @typedef {Object<string, Object<string, NormalResource>>} Graph
 */

/**
 * Creates an empty graph structure based on a schema
 * @param {import('./schema.js').Schema} schema - The schema to base the graph on
 * @returns {Graph} Empty graph structure
 */
function createEmptyGraph(schema) {
	ensureValidSchema(schema);
	return lodashEs.mapValues(schema.resources, () => ({}));
}

/**
 * Links inverse relationships in a graph
 * @param {Graph} graph - The graph to link inverses in
 * @param {import('./schema.js').Schema} schema - The schema defining relationships
 * @returns {Graph} Graph with inverse relationships linked
 */
function linkInverses(graph, schema) {
	const output = structuredClone(graph);

	Object.entries(schema.resources).forEach(([resType, resSchema]) => {
		const sampleRes = Object.values(graph[resType])[0];
		if (!sampleRes) return;

		Object.entries(resSchema.relationships).forEach(([relName, relSchema]) => {
			const { cardinality, type: foreignType, inverse } = relSchema;

			if (sampleRes.relationships[relName] !== undefined || !inverse) return;

			if (cardinality === "one") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						utils.applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							map[foreignRef.id] = foreignId;
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? { type: foreignType, id: map[localId] }
						: null;
				});
			} else if (cardinality === "many") {
				const map = {};
				Object.entries(graph[foreignType]).forEach(
					([foreignId, foreignRes]) => {
						utils.applyOrMap(foreignRes.relationships[inverse], (foreignRef) => {
							if (!map[foreignRef.id]) map[foreignRef.id] = [];
							map[foreignRef.id].push(foreignId);
						});
					},
				);

				Object.entries(output[resType]).forEach(([localId, localRes]) => {
					localRes.relationships[relName] = map[localId]
						? map[localId].map((id) => ({ type: foreignType, id }))
						: [];
				});
			}
		});
	});

	return output;
}

/**
 * Merges two graphs together
 * @param {Graph} left - The left graph
 * @param {Graph} right - The right graph
 * @returns {Graph} Merged graph
 */
function mergeGraphs(left, right) {
	const output = structuredClone(left);
	Object.entries(right).forEach(([resourceType, resources]) => {
		output[resourceType] = { ...resources, ...(left[resourceType] ?? {}) };
	});

	return output;
}

/**
 * @typedef {string | function(any): unknown} Mapper
 */

/**
 * @typedef {Object} ResourceMappers
 * @property {string} [id]
 * @property {Mapper} [k] - Dynamic property for any key
 */

/**
 * @typedef {Object<string, ResourceMappers>} GraphMappers
 */

/**
 * @param {string} resourceId
 * @param {import('./graph.js').NormalResource} resource
 * @param {string} [idAttribute="id"]
 * @returns {Object<string, unknown>}
 */
function flattenResource(resourceId, resource, idAttribute = "id") {
	const relationships = lodashEs.mapValues(resource.relationships, (_, relName) =>
		utils.applyOrMap(resource.relationships[relName], ({ id }) => id),
	);

	return {
		[idAttribute]: resourceId,
		...resource.attributes,
		...relationships,
	};
}

/**
 * @param {string} resourceType
 * @param {Object<string, unknown>} resource
 * @param {import('./schema.js').Schema} schema
 * @param {GraphMappers} [graphMappers={}]
 * @returns {import('./graph.js').NormalResource}
 */
function normalizeResource(
	resourceType,
	resource,
	schema,
	graphMappers = {},
) {
	const resSchema = schema.resources[resourceType];
	const resourceMappers = graphMappers[resourceType] ?? {};

	const attributes = lodashEs.mapValues(resSchema.attributes, (_, attr) => {
		const mapper = resourceMappers[attr];

		return typeof mapper === "function"
			? mapper(resource)
			: mapper
				? resource[mapper]
				: resource[attr];
	});

	const relationships = lodashEs.mapValues(resSchema.relationships, (relSchema, rel) => {
		const relMapper = graphMappers[relSchema.type] ?? {};
		const relResSchema = schema.resources[relSchema.type];
		const mapper = resourceMappers[rel];
		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const relIdField = relMapper.id ?? relResSchema.idAttribute ?? "id";

		const relVal =
			typeof mapper === "function"
				? mapper(resource)
				: mapper
					? resource[mapper]
					: resource[rel];

		if (relVal === undefined) return undefined;

		return utils.applyOrMap(relVal ?? emptyRel, (relRes) =>
			typeof relRes === "object"
				? { type: relSchema.type, id: relRes[relIdField] }
				: { type: relSchema.type, id: relRes },
		);
	});

	return {
		type: resourceType,
		id: resource[resSchema.idAttribute ?? "id"],
		attributes: lodashEs.pickBy(attributes, (a) => a !== undefined),
		relationships: lodashEs.pickBy(relationships, (r) => r !== undefined),
	};
}

/**
 * @param {import('./graph.js').NormalResource} left
 * @param {Object} [right={ attributes: {}, relationships: {} }]
 * @returns {import('./graph.js').NormalResource}
 */
function mergeResources(left, right = { attributes: {}, relationships: {} }) {
	return {
		...left,
		attributes: { ...left.attributes, ...right.attributes },
		relationships: { ...left.relationships, ...right.relationships },
	};
}

/**
 * @param {string} rootResourceType
 * @param {Object<string, unknown>[]} rootResources
 * @param {import('./schema.js').Schema} schema
 * @param {GraphMappers} [graphMappers={}]
 * @returns {import('./graph.js').Graph}
 */
function createGraphFromTrees(
	rootResourceType,
	rootResources,
	schema,
	graphMappers = {},
) {
	const output = lodashEs.mapValues(schema.resources, () => ({}));

	const go = (resourceType, resource) => {
		const resourceSchema = schema.resources[resourceType];
		const resourceMappers = graphMappers[resourceType] ?? {};

		const idAttribute =
			resourceMappers.id ?? resourceSchema.idAttribute ?? "id";
		const resourceId = resource[idAttribute];

		output[resourceType][resourceId] = mergeResources(
			normalizeResource(resourceType, resource, schema, graphMappers),
			output[resourceType][resourceId],
		);

		Object.entries(resourceSchema.relationships).forEach(
			([relName, relSchema]) => {
				const mapper = resourceMappers[relName];
				const emptyRel = relSchema.cardinality === "many" ? [] : null;

				const relVal =
					typeof mapper === "function"
						? mapper(resource)
						: mapper
							? resource[mapper]
							: resource[relName];

				return utils.applyOrMap(relVal ?? emptyRel, (relRes) => {
					if (typeof relRes === "object") go(relSchema.type, relRes);
				});
			},
		);
	};

	rootResources.forEach((r) => {
		go(rootResourceType, r);
	});

	return output;
}

// WARNING: MUTATES storeGraph
/**
 * @param {import('./graph.js').NormalResource} resource
 * @param {Object} context
 * @param {import('./schema.js').Schema} context.schema
 * @param {import('./graph.js').Graph} context.storeGraph
 * @returns {import('./graph.js').NormalResource}
 */
function createOrUpdate(resource, context) {
	const { schema, storeGraph } = context;
	const { type } = resource;

	const resSchema = schema.resources[resource.type];

	Object.entries(resource.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			/** @type {import('./graph.js').Ref[]} */
			const refs =
				related === null ? [] : Array.isArray(related) ? related : [related];

			if (inverseRel.cardinality === "one") {
				refs.forEach((ref) => {
					/** @type {import('./graph.js').Ref | null} */
					const currentInverseRef = storeGraph[relType][ref.id].relationships[
						inverse
					];

					if (currentInverseRef && currentInverseRef.id !== ref.id) {
						if (relSchema.cardinality === "one") {
							storeGraph[type][currentInverseRef.id].relationships[relName] =
								null;
						} else {
							storeGraph[type][currentInverseRef.id].relationships[relName] = (
								/** @type {import('./graph.js').Ref[]} */ (storeGraph[type][currentInverseRef.id].relationships[
									relName
								])
							).filter((r) => r.id !== storeGraph[relType][ref.id].id);
						}
					}

					storeGraph[relType][ref.id].relationships[inverse] = {
						type: resource.type,
						id: resource.id,
					};
				});
			} else {
				refs.forEach((ref) => {
					const isRedundantRef = (
						/** @type {import('./graph.js').Ref[]} */ (storeGraph[ref.type][ref.id].relationships[inverse]) ?? []
					).some((r) => r.id === resource.id);

					if (!isRedundantRef) {
						(
							/** @type {import('./graph.js').Ref[]} */ (storeGraph[ref.type][ref.id].relationships[inverse]) ??
							[]
						).push({
							type: resource.type,
							id: resource.id,
						});
					}
				});
			}
		}
	});

	storeGraph[resource.type][resource.id] = resource;

	return resource;
}

/**
 * @typedef {Object} DeleteResource
 * @property {string} type
 * @property {string} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, import('./graph.js').Ref | import('./graph.js').Ref[]>} [relationships]
 */

// WARNING: MUTATES storeGraph
/**
 * @param {DeleteResource} resource
 * @param {Object} context
 * @param {import('./schema.js').Schema} context.schema
 * @param {import('./graph.js').Graph} context.storeGraph
 * @returns {DeleteResource}
 */
function deleteAction(resource, context) {
	const { schema, storeGraph } = context;
	const { type, id } = resource;
	const resSchema = schema.resources[resource.type];
	/** @type {import('./graph.js').NormalResource} */
	const existingRes = storeGraph[type][id];

	Object.entries(existingRes.relationships).forEach(([relName, related]) => {
		const relSchema = resSchema.relationships[relName];
		const { inverse, type: relType } = relSchema;
		if (inverse) {
			const inverseResSchema = schema.resources[relType];
			const inverseRel = inverseResSchema.relationships[inverse];

			/** @type {import('./graph.js').Ref[]} */
			const refs =
				related === null ? [] : Array.isArray(related) ? related : [related];

			if (inverseRel.cardinality === "one") {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = null;
				});
			} else {
				refs.forEach((ref) => {
					storeGraph[relType][ref.id].relationships[inverse] = (
						/** @type {import('./graph.js').Ref[]} */ (storeGraph[relType][ref.id].relationships[inverse]) ?? []
					).filter((r) => r.id !== resource.id);
				});
			}
		}
	});

	delete storeGraph[type][id];

	return resource;
}

/**
 * @typedef {Object} ColumnTypeModifier
 * @property {function(any): any} [castForValidation]
 * @property {Object} [schemaProperties]
 * @property {string} schemaProperties.type
 * @property {string} [schemaProperties.format]
 * @property {string} [schemaProperties.$ref]
 * @property {Object<string, {
 *   castForValidation?: function(any): any,
 *   schemaProperties?: {
 *     type: string,
 *     format?: string,
 *     $ref?: string
 *   }
 * }>} [subTypes]
 */

/**
 * @type {Object<string, ColumnTypeModifier>}
 */
const columnTypeModifiers = {
	// ajv formats
	date: {
		schemaProperties: { type: "string", format: "date" },
		castForValidation: (val) =>
			val instanceof Date ? val.toISOString().split("T")[0] : val,
	},
	time: {
		schemaProperties: { type: "string", format: "time" },
		castForValidation: (val) =>
			val instanceof Date ? val.toISOString().split("T")[1] : val,
	},
	"date-time": {
		schemaProperties: {
			type: "string",
			format: "date-time",
		},
		castForValidation: (val) => (val instanceof Date ? val.toISOString() : val),
	},
	duration: { schemaProperties: { type: "string", format: "duration" } },
	uri: { schemaProperties: { type: "string", format: "uri" } },
	"uri-reference": {
		schemaProperties: { type: "string", format: "uri-reference" },
	},
	url: { schemaProperties: { type: "string", format: "url" } },
	email: { schemaProperties: { type: "string", format: "email" } },
	hostname: { schemaProperties: { type: "string", format: "hostname" } },
	ipv4: { schemaProperties: { type: "string", format: "ipv4" } },
	ipv6: { schemaProperties: { type: "string", format: "ipv6" } },
	regex: { schemaProperties: { type: "string", format: "regex" } },
	uuid: { schemaProperties: { type: "string", format: "uuid" } },
	"json-pointer": {
		schemaProperties: { type: "string", format: "json-pointer" },
	},
	"relative-json-pointer": {
		schemaProperties: { type: "string", format: "relative-json-pointer" },
	},
};

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {number|string} [id]
 * @property {Object<string, *>} [attributes]
 * @property {Object<string, import('./graph.js').Ref|import('./graph.js').Ref[]|null>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {number|string} id
 * @property {Object<string, *>} [attributes]
 * @property {Object<string, import('./graph.js').Ref|import('./graph.js').Ref[]|null>} [relationships]
 */

/**
 * @typedef {import('./graph.js').Ref} DeleteResource
 */

const defaultValidator = new Ajv();
addFormats(defaultValidator);

/**
 * Creates a new validator instance
 * @param {Object} options
 * @param {Array} [options.ajvSchemas] - Additional schemas to add
 * @returns {Ajv} Configured validator instance
 */
const createValidator = ({ ajvSchemas = [] } = {}) => {
	const ajv = new Ajv();
	addFormats(ajv);

	ajvSchemas.forEach((schema) => ajv.addSchema(schema, schema.$id));

	return ajv;
};

/**
 * Validates a create resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {CreateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
function validateCreateResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
		},
	});
	if (!validateBasis(resource)) return validateBasis.errors;

	const resSchema = schema.resources[resource.type];
	const validationSchema = {
		type: "object",
		required: [
			"type",
			...(Object.keys(resSchema.attributes).some(
				(k) => resSchema.attributes[k].required,
			)
				? ["attributes"]
				: []),
			...(Object.keys(resSchema.relationships).some(
				(k) => resSchema.relationships[k].required,
			)
				? ["relationships"]
				: []),
		],
		properties: {
			type: { const: resource.type },
			id: { type: "string" },
			attributes: {
				type: "object",
				required: Object.keys(resSchema.attributes).filter(
					(k) => resSchema.attributes[k].required,
				),
				additionalProperties: false,
				properties: lodashEs.mapValues(resSchema.attributes, (a) => ({
					...lodashEs.omit(a, ["required", "subType"]),
					...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
						?.schemaProperties
						? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
						: columnTypeModifiers[a.type]?.schemaProperties
							? columnTypeModifiers[a.type].schemaProperties
							: {}),
				})),
			},
			relationships: {
				type: "object",
				required: Object.keys(resSchema.relationships).filter(
					(k) => resSchema.relationships[k].required,
				),
				additionalProperties: false,
				properties: lodashEs.mapValues(resSchema.relationships, (relSchema) =>
					relSchema.cardinality === "one"
						? relSchema.required
							? {
									type: "object",
									required: ["type", "id"],
									properties: {
										type: { const: relSchema.type },
										id: { type: "string" },
									},
								}
							: {
									oneOf: [
										{
											type: "object",
											required: ["type", "id"],
											properties: {
												type: { const: relSchema.type },
												id: { type: "string" },
											},
										},
										{ type: "null" },
									],
								}
						: {
								type: "array",
								items: {
									type: "object",
									required: ["type", "id"],
									properties: {
										type: { const: relSchema.type },
										id: { type: "string" },
									},
								},
							},
				),
			},
		},
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: lodashEs.mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	validate(castResource);
	if (!validate(castResource)) return validate.errors;

	return [];
}

/**
 * Validates an update resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {UpdateResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
function validateUpdateResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
			id: { type: "string" },
		},
	});
	if (!validateBasis(resource)) return validateBasis.errors;

	const resSchema = schema.resources[resource.type];
	const validationSchema = {
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { const: resource.type },
			id: { type: "string" },
			attributes: {
				type: "object",
				additionalProperties: false,
				properties: lodashEs.mapValues(resSchema.attributes, (a) => ({
					...lodashEs.omit(a, ["required", "subType"]),
					...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
						?.schemaProperties
						? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
						: columnTypeModifiers[a.type]?.schemaProperties
							? columnTypeModifiers[a.type].schemaProperties
							: {}),
				})),
			},
			relationships: {
				type: "object",
				additionalProperties: false,
				properties: lodashEs.mapValues(resSchema.relationships, (relSchema) =>
					relSchema.cardinality === "one"
						? relSchema.required
							? {
									type: "object",
									required: ["type", "id"],
									properties: {
										type: { const: relSchema.type },
										id: { type: "string" },
									},
								}
							: {
									oneOf: [
										{
											type: "object",
											required: ["type", "id"],
											properties: {
												type: { const: relSchema.type },
												id: { type: "string" },
											},
										},
										{ type: "null" },
									],
								}
						: {
								type: "array",
								items: {
									type: "object",
									required: ["type", "id"],
									properties: {
										type: { const: relSchema.type },
										id: { type: "string" },
									},
								},
							},
				),
			},
		},
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: lodashEs.mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	if (!validate(castResource)) return validate.errors;

	return [];
}

/**
 * Validates a delete resource operation
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {DeleteResource} resource - The resource to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
function validateDeleteResource(
	schema,
	resource,
	validator = defaultValidator,
) {
	const validateBasis = validator.compile({
		type: "object",
		required: ["type", "id"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
			id: { type: "string" },
		},
	});
	if (!validateBasis(resource)) return validateBasis.errors;

	return [];
}

/**
 * Validates a resource tree
 * @param {import('./schema.js').Schema} schema - The schema to validate against
 * @param {*} resource - The resource tree to validate
 * @param {Ajv} [validator] - The validator instance to use
 * @returns {Array} Array of validation errors
 */
function validateResourceTree(
	schema,
	resource,
	validator = defaultValidator,
) {
	const basisSchema = {
		type: "object",
		required: ["type"],
		properties: {
			type: { enum: Object.keys(schema.resources) },
		},
	};
	const validateBasis = validator.compile(basisSchema);
	if (!validateBasis(resource)) return validateBasis.errors;

	const toOneRefOfType = (type, required) => ({
		anyOf: [
			...(required ? [] : [{ type: "null" }]),
			{
				type: "object",
				required: ["type", "id"],
				additionalProperties: false,
				properties: { type: { const: type }, id: { type: "string" } },
			},
			{ $ref: `#/definitions/create/${type}` },
			{ $ref: `#/definitions/update/${type}` },
		],
	});
	const toManyRefOfType = (type) => ({
		type: "array",
		items: toOneRefOfType(type, true),
	});

	const resSchema = schema.resources[resource.type];

	const definitions = { create: {}, update: {} };
	Object.entries(schema.resources).forEach(([resName, resSchema]) => {
		const hasRequiredAttributes = Object.keys(resSchema.attributes).some(
			(k) => resSchema.attributes[k].required,
		);
		const hasRequiredRelationships = Object.keys(resSchema.relationships).some(
			(k) => resSchema.relationships[k].required,
		);

		const required = ["type"];
		if (hasRequiredAttributes) required.push("attributes");
		if (hasRequiredRelationships) required.push("relationships");
		definitions.create[resName] = {
			type: "object",
			required,
			additionalProperties: false,
			properties: {
				type: { const: resName },
				new: { type: "boolean", const: true },
				attributes: {
					type: "object",
					required: Object.keys(resSchema.attributes).filter(
						(k) => resSchema.attributes[k].required,
					),
					additionalProperties: false,
					properties: lodashEs.mapValues(resSchema.attributes, (a) => ({
						...lodashEs.omit(a, ["required", "subType"]),
						...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
							?.schemaProperties
							? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
							: columnTypeModifiers[a.type]?.schemaProperties
								? columnTypeModifiers[a.type].schemaProperties
								: {}),
					})),
				},
				relationships: {
					type: "object",
					required: Object.keys(resSchema.relationships).filter(
						(k) => resSchema.relationships[k].required,
					),
					additionalProperties: false,
					properties: lodashEs.mapValues(resSchema.relationships, (relSchema) =>
						relSchema.cardinality === "one"
							? relSchema.required
								? toOneRefOfType(relSchema.type, true)
								: toOneRefOfType(relSchema.type, false)
							: toManyRefOfType(relSchema.type),
					),
				},
			},
		};

		definitions.update[resName] = {
			type: "object",
			required: ["type", "id"],
			additionalProperties: false,
			properties: {
				type: { const: resName },
				id: { type: "string" },
				new: { type: "boolean", const: false },
				attributes: {
					type: "object",
					additionalProperties: false,
					properties: lodashEs.mapValues(resSchema.attributes, (a) => ({
						...lodashEs.omit(a, ["required", "subType"]),
						...(columnTypeModifiers[a.type]?.subTypes?.[a.subType]
							?.schemaProperties
							? columnTypeModifiers[a.type].subTypes[a.subType].schemaProperties
							: columnTypeModifiers[a.type]?.schemaProperties
								? columnTypeModifiers[a.type].schemaProperties
								: {}),
					})),
				},
				relationships: {
					type: "object",
					additionalProperties: false,
					properties: lodashEs.mapValues(resSchema.relationships, (relSchema) =>
						relSchema.cardinality === "one"
							? relSchema.required
								? toOneRefOfType(relSchema.type, true)
								: toOneRefOfType(relSchema.type, false)
							: toManyRefOfType(relSchema.type),
					),
				},
			},
		};
	});

	const validationSchema = {
		$ref: resource.id
			? `#/definitions/update/${resource.type}`
			: `#/definitions/create/${resource.type}`,
		definitions,
	};

	const validate = validator.compile(validationSchema);
	const castResource = {
		...resource,
		attributes: lodashEs.mapValues(resource.attributes, (v, k) => {
			const attrSchema = resSchema.attributes[k];
			const { castForValidation } =
				columnTypeModifiers[attrSchema?.type]?.subTypes?.[attrSchema.subType] ??
				columnTypeModifiers[attrSchema?.type] ??
				{};

			return castForValidation ? castForValidation(v) : v;
		}),
	};

	if (!validate(castResource)) return validate.errors;

	return [];
}

/**
 * @typedef {Object} Context
 * @property {import('./schema.js').Schema} schema
 * @property {Ajv} validator
 * @property {import('./memory-store.js').MemoryStore} store
 * @property {import('./graph.js').Graph} storeGraph
 */

/**
 * @param {import('./memory-store.js').NormalResourceTree} resourceTree
 * @param {Context} context
 * @returns {import('./memory-store.js').NormalResourceTree}
 */
function splice(
	resourceTree,
	context,
) {
	const { schema, validator, store, storeGraph } = context;
	const errors = validateResourceTree(schema, resourceTree, validator);
	if (errors.length > 0) throw new Error("invalid resource", { cause: errors });

	/**
	 * @param {import('./memory-store.js').NormalResourceTree} res
	 * @returns {import('./graph.js').Ref[]}
	 */
	const expectedExistingResources = (res) => {
		const related = Object.values(res.relationships ?? {}).flatMap((rel) =>
			rel
				? Array.isArray(rel)
					? rel.flatMap((r) =>
							("attributes" in r || "relationships" in r) && "id" in r
								? expectedExistingResources(r)
								: rel,
						)
					: "attributes" in rel || "relationships" in rel
						? expectedExistingResources(rel)
						: rel
				: null,
		);

		return !res.id ? related : [{ type: res.type, id: res.id }, ...related];
	};

	const missing = expectedExistingResources(resourceTree)
		.filter((ref) => ref && ref.id)
		.find(({ type, id }) => !store.getOne(type, id));
	if (missing) {
		throw new Error(
			`expected { type: "${missing.type}", id: "${missing.id}" } to already exist in the graph`,
		);
	}

	/**
	 * @param {import('./memory-store.js').NormalResourceTree} res
	 * @param {import('./memory-store.js').NormalResourceTree | null} [parent=null]
	 * @param {any} [parentRelSchema=null]
	 * @returns {import('./memory-store.js').NormalResourceTree}
	 */
	const go = (
		res,
		parent = null,
		parentRelSchema = null,
	) => {
		const resSchema = schema.resources[res.type];
		const resCopy = structuredClone(res);
		const inverse = parentRelSchema?.inverse;

		if (parent && inverse) {
			const relSchema = resSchema.relationships[inverse];
			resCopy.relationships = resCopy.relationships ?? {};
			if (
				relSchema.cardinality === "many" &&
				!(
					/** @type {import('./graph.js').Ref[] | import('./memory-store.js').NormalResourceTree[]} */ (resCopy.relationships[inverse] ?? [])
				).some((r) => r.id === res.id)
			) {
				resCopy.relationships[inverse] = [
					.../** @type {import('./graph.js').Ref[] | import('./memory-store.js').NormalResourceTree[]} */ (resCopy.relationships[inverse] ?? []),
					{ type: parent.type, id: parent.id },
				];
			} else if (relSchema.cardinality === "one") {
				const existing = store.getOne(parent.type, parent.id);
				/** @type {import('./graph.js').Ref} */
				const existingRef = existing?.relationships?.[inverse];

				if (existingRef && existingRef.id !== parent.id) {
					storeGraph[existing.type][existing.id] = {
						...existing,
						relationships: { ...existing.relationships, [inverse]: null },
					};
				}

				resCopy.relationships[inverse] = { type: parent.type, id: parent.id };
			}
		}

		const existing = store.getOne(res.type, res.id);
		/** @type {string} */
		const resultId = res.id ?? existing?.id ?? uuid.v4();
		const prepped = res.id
			? {
					type: resCopy.type,
					id: resultId,
					attributes: { ...existing.attributes, ...resCopy.attributes },
					relationships: {
						...existing.relationships,
						...resCopy.relationships,
					},
				}
			: {
					type: resCopy.type,
					id: resultId,
					attributes: resCopy.attributes ?? {},
					relationships: {
						...lodashEs.mapValues(resSchema.relationships, (r) =>
							r.cardinality === "one" ? null : [],
						),
						...resCopy.relationships,
					},
				};

		const normalized = {
			...prepped,
			relationships: /** @type {Object<string, import('./graph.js').Ref | import('./graph.js').Ref[]>} */ (lodashEs.pick(prepped.relationships, ["type", "id"])),
		};

		storeGraph[res.type][resultId] = existing
			? {
					...normalized,
					attributes: { ...existing.attributes, ...normalized.attributes },
					relationships: {
						...existing.relationships,
						...normalized.relationships,
					},
				}
			: normalized;

		const preppedRels = lodashEs.mapValues(
			prepped.relationships ?? {},
			(rel, relName) => {
				const relSchema = resSchema.relationships[relName];
				const step = (relRes) =>
					relRes.attributes || relRes.relationships
						? go(relRes, prepped, relSchema)
						: relRes;

				const result = utils.applyOrMap(rel, step);
				storeGraph[res.type][resultId].relationships[relName] = utils.applyOrMap(
					result,
					(r) => ({ type: relSchema.type, id: r.id }),
				);

				return result;
			},
		);

		return { ...prepped, relationships: preppedRels };
	};

	return go(resourceTree, null, null);
}

/**
 * @typedef {Object} Ref
 * @property {string} type
 * @property {string} id
 */

/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type
 * @property {string} [id]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} MemoryStoreConfig
 * @property {import('./graph.js').Graph} [initialData]
 * @property {Ajv} [validator]
 */

/**
 * @typedef {Object} CreateResource
 * @property {string} type
 * @property {string} [id]
 * @property {boolean} [new]
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} UpdateResource
 * @property {string} type
 * @property {string} id
 * @property {Object<string, unknown>} [attributes]
 * @property {Object<string, Ref | Ref[] | null>} [relationships]
 */

/**
 * @typedef {Object} Store
 * @property {function(string, string): import('./graph.js').NormalResource} getOne
 * @property {function(CreateResource): import('./graph.js').NormalResource} create
 * @property {function(UpdateResource): import('./graph.js').NormalResource} update
 * @property {function(CreateResource | UpdateResource): import('./graph.js').NormalResource} upsert
 * @property {function(import('./delete.js').DeleteResource): import('./delete.js').DeleteResource} delete
 * @property {function(import('./query.js').RootQuery): any} query
 * @property {function(NormalResourceTree): NormalResourceTree} splice
 */

/**
 * @typedef {Store & {
 *   linkInverses: function(): void,
 *   merge: function(import('./graph.js').Graph): void,
 *   mergeTree: function(string, any, any?): void,
 *   mergeTrees: function(string, any[], any?): void
 * }} MemoryStore
 */

/**
 * @param {import('./schema.js').Schema} schema
 * @param {MemoryStoreConfig} [config={}]
 * @returns {MemoryStore}
 */
function createMemoryStore(schema, config = {}) {
	const { initialData = {}, validator = defaultValidator } = config;

	ensureValidSchema(schema);

	let queryGraph;
	let storeGraph = mergeGraphs(createEmptyGraph(schema), initialData);

	const runQuery = (query) => {
		if (!queryGraph) queryGraph = createQueryGraph(storeGraph);
		const normalQuery = normalizeQuery(schema, query);

		ensureValidQuery(schema, normalQuery);
		return queryGraph.query(normalQuery);
	};

	// WARNING: MUTATES storeGraph
	const create = (resource) => {
		const { id, type } = resource;
		const resSchema = schema.resources[resource.type];
		const { idAttribute = "id" } = resSchema;
		const newId = id ?? uuid.v4();

		const errors = validateCreateResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		/** @type {import('./graph.js').NormalResource} */
		const normalRes = {
			attributes: { ...(resource.attributes ?? {}), [idAttribute]: newId },
			relationships: lodashEs.mapValues(
				resSchema.relationships,
				(rel, relName) =>
					resource.relationships?.[relName] ??
					(rel.cardinality === "one" ? null : []),
			),
			id: newId,
			type,
		};

		queryGraph = null;
		return createOrUpdate(normalRes, { schema, storeGraph });
	};

	// WARNING: MUTATES storeGraph
	const update = (resource) => {
		const errors = validateUpdateResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		const existingRes = storeGraph[resource.type][resource.id];

		/** @type {import('./graph.js').NormalResource} */
		const normalRes = {
			...resource,
			attributes: { ...existingRes.attributes, ...resource.attributes },
			relationships: {
				...existingRes.relationships,
				...resource.relationships,
			},
		};

		// WARNING: MUTATES storeGraph
		queryGraph = null;
		return createOrUpdate(normalRes, { schema, storeGraph });
	};

	const upsert = (resource) => {
		return "id" in resource && storeGraph[resource.type][resource.id]
			? update(resource)
			: create(resource);
	};

	const delete_ = (resource) => {
		const errors = validateDeleteResource(schema, resource, validator);
		if (errors.length > 0)
			throw new Error("invalid resource", { cause: errors });

		queryGraph = null;
		return deleteAction(resource, { schema, storeGraph });
	};

	const merge = (graph) => {
		queryGraph = null;
		storeGraph = mergeGraphs(storeGraph, graph);
	};

	const mergeTrees = (resourceType, trees, mappers = {}) => {
		const graph = createGraphFromTrees(resourceType, trees, schema, mappers);
		merge(graph);
	};

	const mergeTree = (resourceType, tree, mappers = {}) => {
		mergeTrees(resourceType, [tree], mappers);
	};

	const linkStoreInverses = () => {
		queryGraph = null;
		storeGraph = linkInverses(storeGraph, schema);
	};

	return {
		linkInverses: linkStoreInverses,
		getOne(type, id) {
			return storeGraph[type][id] ?? null;
		},
		create,
		update,
		upsert,
		delete: delete_,
		merge,
		mergeTree,
		mergeTrees,
		query: runQuery,
		splice(resource) {
			queryGraph = null;
			return splice(resource, { schema, validator, store: this, storeGraph });
		},
	};
}

exports.createEmptyGraph = createEmptyGraph;
exports.createGraphFromTrees = createGraphFromTrees;
exports.createMemoryStore = createMemoryStore;
exports.createQueryGraph = createQueryGraph;
exports.createValidator = createValidator;
exports.ensureValidQuery = ensureValidQuery;
exports.ensureValidSchema = ensureValidSchema;
exports.flattenResource = flattenResource;
exports.forEachQuery = forEachQuery;
exports.forEachSchemalessQuery = forEachSchemalessQuery;
exports.linkInverses = linkInverses;
exports.mapQuery = mapQuery;
exports.mapSchemalessQuery = mapSchemalessQuery;
exports.mergeGraphs = mergeGraphs;
exports.normalizeQuery = normalizeQuery;
exports.normalizeResource = normalizeResource;
exports.queryGraph = queryGraph;
exports.reduceQuery = reduceQuery;
exports.reduceSchemalessQuery = reduceSchemalessQuery;
exports.validateCreateResource = validateCreateResource;
exports.validateDeleteResource = validateDeleteResource;
exports.validateResourceTree = validateResourceTree;
exports.validateUpdateResource = validateUpdateResource;
