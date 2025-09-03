'use strict';

var esToolkit = require('es-toolkit');
var core = require('@data-prism/core');

/**
 * @typedef {Object} QueryBreakdownItem
 * @property {string[]} path - Path to this query level
 * @property {any} attributes - Selected attributes
 * @property {any} relationships - Selected relationships
 * @property {string} type - Resource type
 * @property {import('@data-prism/core').Query} query - The query object
 * @property {QueryBreakdownItem|null} parent - Parent breakdown item if any
 * @property {import('@data-prism/core').Query|null} parentQuery - Parent query if any
 * @property {string|null} parentRelationship - Parent relationship name if any
 */

/**
 * @typedef {QueryBreakdownItem[]} QueryBreakdown
 */

/**
 * Flattens a nested query into a linear array of query breakdown items
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} rootQuery - The root query to flatten
 * @returns {QueryBreakdown} Flattened query breakdown
 */
function flattenQuery(schema, rootQuery) {
	const go = (query, type, path, parent = null, parentRelationship = null) => {
		const resDef = schema.resources[type];
		const { idAttribute = "id" } = resDef;
		const [attributesEntries, relationshipsEntries] = esToolkit.partition(
			Object.entries(query.select ?? {}),
			([, propVal]) =>
				typeof propVal === "string" &&
				(propVal in resDef.attributes || propVal === idAttribute),
		);

		const attributes = attributesEntries.map((pe) => pe[1]);
		const relationshipKeys = relationshipsEntries.map((pe) => pe[0]);

		const level = {
			attributes,
			parent,
			parentQuery: parent?.query ?? null,
			parentRelationship,
			path,
			query,
			relationships: esToolkit.pick(query.select, relationshipKeys),
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
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => any} fn - Mapping function
 * @returns {any[]} Mapped results
 */
function flatMapQuery(schema, query, fn) {
	return flattenQuery(schema, query).flatMap((info) => fn(info.query, info));
}

/**
 * Iterates over each query in a flattened query structure
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => void} fn - Iteration function
 */
function forEachQuery(schema, query, fn) {
	return flattenQuery(schema, query).forEach((info) => fn(info.query, info));
}

/**
 * Tests whether some query in a flattened query structure matches a condition
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(query: import('@data-prism/core').Query, info: QueryBreakdownItem) => boolean} fn - Test function
 * @returns {boolean} Whether any query matches the condition
 */
function someQuery(schema, query, fn) {
	return flattenQuery(schema, query).some((q) => fn(q.query, q));
}

/**
 * @typedef {Object} RelBuilderParams
 * @property {any} foreignConfig - Foreign resource configuration
 * @property {string} foreignTableAlias - Alias for foreign table
 * @property {any} localConfig - Local resource configuration
 * @property {string} localQueryTableName - Local query table name
 * @property {string} relName - Relationship name
 * @property {string} foreignIdCol - Foreign ID column
 * @property {string} [localIdCol] - Local ID column
 * @property {any} [localResSchema] - Local resource schema
 */

/**
 * @typedef {Object} RelBuilders
 * @property {Object} one - One-to-* relationship builders
 * @property {(params: RelBuilderParams) => string[]} one.one - One-to-one builder
 * @property {(params: RelBuilderParams) => string[]} one.many - One-to-many builder
 * @property {Object} many - Many-to-* relationship builders
 * @property {(params: RelBuilderParams) => string[]} many.one - Many-to-one builder
 * @property {(params: RelBuilderParams) => string[]} many.many - Many-to-many builder
 * @property {Object} none - No inverse relationship builders
 * @property {(params: RelBuilderParams) => string[]} none.many - None-to-many builder
 */

/**
 * Creates relationship builders for different cardinality combinations
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @returns {RelBuilders} The relationship builders
 */
function makeRelationshipBuilders(schema) {
	return {
		one: {
			one(params) {
				const {
					foreignConfig,
					foreignTableAlias,
					localConfig,
					localQueryTableName,
					relName,
					foreignIdCol,
				} = params;

				const { localColumn } = localConfig.joins[relName];
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localColumn} = ${foreignTableAlias}.${foreignIdCol}`,
				];
			},
			many(params) {
				const {
					foreignConfig,
					localIdCol,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
				} = params;

				const foreignTable = foreignConfig.table;
				const foreignJoinColumn = localConfig.joins[relName].foreignColumn;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localIdCol} = ${foreignTableAlias}.${foreignJoinColumn}`,
				];
			},
		},
		many: {
			one(params) {
				const {
					localConfig,
					localQueryTableName,
					relName,
					foreignConfig,
					foreignTableAlias,
					foreignIdCol,
				} = params;

				const localJoinColumn = localConfig.joins[relName].localColumn;
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localJoinColumn} = ${foreignTableAlias}.${foreignIdCol}`,
				];
			},
			many(params) {
				const {
					foreignConfig,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
					localIdCol,
					foreignIdCol,
				} = params;

				const foreignTable = foreignConfig.table;

				const joinTableName = `${localQueryTableName}$$${relName}`;
				const { joinTable, localJoinColumn, foreignJoinColumn } =
					localConfig.joins[relName];

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localQueryTableName}.${localIdCol} = ${joinTableName}.${localJoinColumn}`,
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${foreignTableAlias}.${foreignIdCol} = ${joinTableName}.${foreignJoinColumn}`,
				];
			},
		},
		none: {
			many({
				localResSchema,
				localQueryTableName,
				relName,
				foreignTableAlias,
			}) {
				const localRelDef = localResSchema.attributes[relName];
				const localJoinColumn = localRelDef.store.join.joinColumn;

				const foreignResSchema = schema.resources[localRelDef.relatedType];
				const foreignTable = foreignResSchema.store.table;
				const foreignRelDef =
					foreignResSchema?.attributes?.[localRelDef.inverse];
				const foreignJoinColumn = foreignRelDef
					? foreignRelDef.store.join.joinColumn
					: localRelDef.store.join.foreignJoinColumn;

				const { joinTable } = localRelDef.store.join;
				const joinTableName = `${localQueryTableName}$$${relName}`;

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${localQueryTableName}.id = ${joinTableName}.${localJoinColumn}`,
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${foreignTableAlias}.id = ${joinTableName}.${foreignJoinColumn}`,
				];
			},
		},
	};
}

/**
 * @typedef {Object} QueryContext
 * @property {any} config - Database configuration
 * @property {any} queryInfo - Query information
 * @property {import('@data-prism/core').RootQuery} rootQuery - Root query
 * @property {import('@data-prism/core').Schema} schema - Schema
 */

/**
 * Handles pre-query relationship setup for JOIN clauses
 * @param {QueryContext} context - Query context
 * @returns {Object} Object with join clauses
 */
const preQueryRelationships = (context) => {
	const { config, queryInfo, rootQuery, schema } = context;
	const { parent, path: queryPath } = queryInfo;

	if (queryPath.length === 0) return {};

	const parentPath = queryPath.slice(0, -1);
	const tablePath = [rootQuery.type, ...queryPath];
	const parentTablePath = [rootQuery.type, ...parentPath];
	const relName = esToolkit.last(queryPath);

	const relationshipBuilders = makeRelationshipBuilders(schema);
	const localQueryTableName = parentTablePath.join("$");

	const localConfig = config.resources[parent.type];
	const localResSchema = schema.resources[parent.type];
	const localIdCol = esToolkit.snakeCase(localResSchema.idAttribute ?? "id");
	const localRelDef = localResSchema.relationships[relName];

	const foreignConfig = config.resources[localRelDef.type];
	const foreignResSchema = schema.resources[localRelDef.type];
	const foreignIdCol = esToolkit.snakeCase(foreignResSchema.idAttribute ?? "id");
	const foreignRelDef = foreignResSchema.relationships[localRelDef.inverse];
	const foreignTableAlias = tablePath.join("$");

	const localResCardinality = localRelDef.cardinality;
	const foreignResCardinality = foreignRelDef?.cardinality ?? "none";

	const builderArgs = {
		localConfig,
		localRelDef,
		localResSchema,
		localQueryTableName,
		localIdCol,
		relName,
		foreignConfig,
		foreignTableAlias,
		foreignIdCol,
	};

	const join =
		relationshipBuilders[foreignResCardinality][localResCardinality](
			builderArgs,
		);

	return { join };
};

/**
 * @typedef {Object} OperatorDefinition
 * @property {Function} compile - Function that compiles the operator expression
 * @property {boolean} [preQuery] - Whether this operator should be evaluated pre-query
 */

/**
 * Creates a comparative operator definition
 * @param {string} sqlOperator - The SQL operator to use (=, >, <, etc.)
 * @returns {OperatorDefinition} The operator definition
 */
const comparative = (sqlOperator) => ({
	compile: (exprVal, compile) => () => {
		const [left, right] = exprVal.map((v) => compile(v)());

		return {
			where: [`${left?.where ?? "?"} ${sqlOperator} ${right?.where ?? "?"}`],
			vars: [...(left?.vars ?? [left]), ...(right?.vars ?? [right])],
		};
	},
});

/**
 * Base constraint operator definitions that work across SQL databases
 * These provide the abstract patterns - each database can implement them specifically
 */
const baseConstraintOperatorDefinitions = {
	$and: {
		compile: (exprVal, compile) => () => {
			const predicates = exprVal.map((val) => compile(val)());
			const wheres = predicates.map((pred) => pred.where).filter(Boolean);
			if (wheres.length === 0) return {};

			return {
				where: [
					`(${predicates
						.map((pred) => pred.where)
						.filter(Boolean)
						.join(") AND (")})`,
				],
				vars: predicates.flatMap((pred) => pred.vars ?? []),
			};
		},
	},
	$prop: {
		compile: (exprVal, _, { query, schema }) => {
			if (!(exprVal in schema.resources[query.type].properties)) {
				throw new Error("invalid property");
			}

			return () => ({
				where: exprVal,
				vars: [],
			});
		},
	},
	// Comparative operators
	$eq: comparative("="),
	$gt: comparative(">"),
	$gte: comparative(">="),
	$lt: comparative("<"),
	$lte: comparative("<="),
	$ne: comparative("!="),
	$in: {
		compile: (args, compile) => (vars) => {
			const [item, array] = args;
			const itemVal = compile(item)(vars);
			const arrayVals = array.map((arg) => compile(arg)(vars));

			if (array.length === 0) return {};

			return {
				where: `${itemVal.where} IN (${arrayVals.map(() => "?").join(", ")})`,
				vars: arrayVals,
			};
		},
	},
	$nin: {
		compile: (args, compile) => (vars) => {
			const [item, array] = args;
			const itemVal = compile(item)(vars);
			const arrayVals = array.map((arg) => compile(arg)(vars));

			if (array.length === 0) return {};

			return {
				where: `${itemVal.where} NOT IN (${arrayVals.map(() => "?").join(", ")})`,
				vars: arrayVals,
			};
		},
	},
};

/**
 * Creates constraint operators with preQuery flag set to true
 * @param {Object} operatorDefinitions - The base operator definitions
 * @returns {Object} Constraint operators with preQuery flag
 */
function createConstraintOperators(
	operatorDefinitions = baseConstraintOperatorDefinitions,
) {
	return esToolkit.mapValues(operatorDefinitions, (definition) => ({
		...definition,
		preQuery: true,
	}));
}

/**
 * SQL expression definitions for common operations
 * These can be used by expression engines in each database store
 */
const baseSqlExpressions = {
	$and: {
		where: (operand) => operand.join(" AND "),
		vars: (operand) => operand.flat(),
	},
	$eq: {
		where: (operand) => `${operand[0]} = ?`,
		vars: (operand) => operand[1],
	},
	$gt: {
		where: (operand) => `${operand[0]} > ?`,
		vars: (operand) => operand[1],
	},
	$gte: {
		where: (operand) => `${operand[0]} >= ?`,
		vars: (operand) => operand[1],
	},
	$lt: {
		where: (operand) => `${operand[0]} < ?`,
		vars: (operand) => operand[1],
	},
	$lte: {
		where: (operand) => `${operand[0]} <= ?`,
		vars: (operand) => operand[1],
	},
	$ne: {
		where: (operand) => `${operand[0]} != ?`,
		vars: (operand) => operand[1],
	},
	$in: {
		where: (operand) =>
			`${operand[0]} IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$nin: {
		where: (operand) =>
			`${operand[0]} NOT IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$or: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => {
			const evaluated = operand.map(evaluate);
			return `(${evaluated.join(") OR (")})`;
		},
		vars: (operand, { evaluate }) => {
			// This would need to be implemented by each database
			return operand.flatMap((op) => evaluate(op));
		},
	},
};

/**
 * @typedef {Object} SelectClauseItem
 * @property {string} value - The select clause value
 */

/**
 * @typedef {Object} GraphExtractContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {import('data-prism').RootQuery} query - The root query
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers for data extraction
 */

/**
 * @typedef {Object.<string, Object.<string, any>>} Graph
 */

// Path string utilities
const buildPathString = (path) => (path.length > 0 ? `$${path.join("$")}` : "");
const buildParentPath = (path) =>
	path.length > 1 ? `$${path.slice(0, -1).join("$")}` : "";

// Resource creation utilities
const findOrCreateResource = (context) => {
	const { graph, type, id, schema } = context;
	const resourceSchema = schema.resources[type];
	const { idAttribute = "id" } = resourceSchema;

	if (!graph[type][id]) {
		graph[type][id] = {
			[idAttribute]: id,
			id,
			type,
			attributes: {},
			relationships: {},
		};
	}
	return graph[type][id];
};

const processRelationship = (context) => {
	const { parent, relationshipName, relationshipDef, childType, childId } =
		context;

	if (relationshipDef.cardinality === "one") {
		parent.relationships[relationshipName] = childId
			? { id: childId, type: childType }
			: null;
	} else {
		parent.relationships[relationshipName] =
			parent.relationships[relationshipName] ?? [];

		if (!parent.relationships[relationshipName].some((r) => r.id === childId)) {
			if (childId !== null) {
				parent.relationships[relationshipName].push({
					type: childType,
					id: childId,
				});
			}
		}
	}
};

/**
 * Extracts a resource graph from raw SQL query results
 * @param {any[][]} rawResults - Raw SQL query results
 * @param {SelectClauseItem[]} selectClause - The select clause items
 * @param {GraphExtractContext} context - Extract context with schema and query
 * @returns {Graph} The extracted resource graph organized by type and ID
 */
function extractGraph(rawResults, selectClause, context) {
	const { schema, query: rootQuery, columnTypeModifiers = {} } = context;
	const graph = esToolkit.mapValues(schema.resources, () => ({}));

	const extractors = flatMapQuery(schema, rootQuery, (_, info) => {
		const { parent, parentQuery, parentRelationship, attributes, type } = info;
		const resSchema = schema.resources[type];
		const { idAttribute = "id" } = resSchema;

		const selectAttributeMap = {};
		selectClause.forEach((attr, idx) => {
			selectAttributeMap[attr.value] = idx;
		});

		const parentType = parent?.type;
		const parentRelDef =
			parentQuery &&
			schema.resources[parentType].relationships[parentRelationship];

		const pathStr = buildPathString(info.path);
		const idPath = `${rootQuery.type}${pathStr}.${esToolkit.snakeCase(idAttribute)}`;
		const idIdx = selectAttributeMap[idPath];

		return (result) => {
			const id = result[idIdx];

			if (parentQuery) {
				const parentResSchema = schema.resources[parentType];
				const parentId =
					result[
						selectAttributeMap[
							`${rootQuery.type}${buildParentPath(info.path)}.${esToolkit.snakeCase(
								parentResSchema.idAttribute ?? "id",
							)}`
						]
					];

				const parent = findOrCreateResource({
					graph,
					type: parentType,
					id: parentId,
					schema,
				});

				processRelationship({
					parent,
					relationshipName: parentRelationship,
					relationshipDef: parentRelDef,
					childType: type,
					childId: id,
				});
			}

			if (!id) return;

			findOrCreateResource({
				graph,
				type,
				id,
				schema,
			});

			if (attributes.length > 0) {
				attributes.forEach((attr) => {
					const resultIdx =
						selectAttributeMap[
							`${rootQuery.type}${pathStr}.${esToolkit.snakeCase(attr)}`
						];
					const resourceSchema = schema.resources[type];
					const attrType = resourceSchema.attributes[attr]?.type;

					graph[type][id].attributes[attr] = columnTypeModifiers[attrType]
						? columnTypeModifiers[attrType].extract(result[resultIdx])
						: result[resultIdx];
				});
			} else {
				graph[type][id].id = id;
				graph[type][id].type = type;
			}
		};
	});

	rawResults.forEach((row) =>
		extractors.forEach((extractor) => extractor(row)),
	);

	return graph;
}

/**
 * @typedef {Object} StoreContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers for query processing
 */

/**
 * @typedef {Object} QueryClauseContext
 * @property {any} queryInfo - Query information
 * @property {import('data-prism').Schema} schema - Schema
 * @property {string} table - Table name
 * @property {import('data-prism').Query} query - Current query
 * @property {import('data-prism').RootQuery} rootQuery - Root query
 * @property {Object} [columnTypeModifiers] - Optional column type modifiers
 */

/**
 * @typedef {Object} ParsedClause
 * @property {string[]} [where] - WHERE clauses
 * @property {any[]} [vars] - SQL variables
 * @property {any[]} [orderBy] - ORDER BY clauses
 * @property {number} [limit] - LIMIT value
 * @property {number} [offset] - OFFSET value
 * @property {any[]} [select] - SELECT clauses
 * @property {any[]} [join] - JOIN clauses
 */

/**
 * Checks if a query has any to-many relationships
 * @param {import('data-prism').Schema} schema - The schema
 * @param {import('data-prism').RootQuery} query - The query to check
 * @returns {boolean} Whether the query has to-many relationships
 */
const hasToManyRelationship = (schema, query) => {
	return someQuery(schema, query, (_, info) =>
		Object.keys(info.relationships).some(
			(relName) =>
				schema.resources[info.type].relationships[relName].cardinality ===
				"many",
		),
	);
};

/**
 * Query clause extractors for different query parts
 * @type {Object<string, (value: any, context: QueryClauseContext) => ParsedClause>}
 */
const QUERY_CLAUSE_EXTRACTORS = {
	id: (id, { queryInfo, schema }) => {
		if (!id) return {};

		const { idAttribute = "id" } = schema.resources[queryInfo.type];

		return {
			where: [`${queryInfo.type}.${esToolkit.snakeCase(idAttribute)} = ?`],
			vars: [id],
		};
	},
	where: (where) => ({ where: [where], vars: [where] }),
	order: (order, { table }) => {
		return {
			orderBy: (Array.isArray(order) ? order : [order]).map((orderEntry) => {
				const k = Object.keys(orderEntry)[0];
				return {
					property: k,
					direction: orderEntry[k],
					table,
				};
			}),
		};
	},
	limit: (limit, { query, queryInfo, schema }) => {
		if (limit < 0) {
			throw new Error("`limit` must be at least 0");
		}

		return queryInfo.path.length > 0 || hasToManyRelationship(schema, query)
			? {}
			: { limit, offset: query.offset ?? 0 };
	},
	offset: (offset, { query }) => {
		if (offset < 0) {
			throw new Error("`offset` must be at least 0");
		}

		if (!query.limit) {
			return { offset };
		}
		return {};
	},
	select: (select, context) => {
		const { schema, table, queryInfo, columnTypeModifiers = {} } = context;
		const { type } = queryInfo;
		const { idAttribute = "id" } = schema.resources[type];
		const resSchema = schema.resources[type];

		const attributeProps = Object.values(select).filter(
			(p) => typeof p === "string",
		);

		const relationshipsModifiers = preQueryRelationships(context);

		return {
			select: esToolkit.uniq([idAttribute, ...attributeProps]).map((col) => {
				const attrSchema = resSchema.attributes[col];
				const value = `${table}.${esToolkit.snakeCase(col)}`;

				return {
					value,
					sql:
						attrSchema && columnTypeModifiers[attrSchema.type]
							? columnTypeModifiers[attrSchema.type].select(value)
							: value,
				};
			}),
			...relationshipsModifiers,
		};
	},
};

/**
 * Parses a query into SQL clauses
 * @param {import('data-prism').RootQuery} query - The query to parse
 * @param {StoreContext} context - Store context
 * @returns {ParsedClause[]} Array of parsed query clauses
 */
function extractQueryClauses(query, context) {
	const { schema } = context;
	const clauses = [];

	forEachQuery(schema, query, (subquery, queryInfo) => {
		const table = [query.type, ...queryInfo.path].join("$");

		Object.entries(subquery).forEach(([key, val]) => {
			if (QUERY_CLAUSE_EXTRACTORS[key]) {
				clauses.push(
					QUERY_CLAUSE_EXTRACTORS[key](val, {
						...context,
						queryInfo,
						rootQuery: query,
						query: subquery,
						table,
					}),
				);
			}
		});
	});

	return clauses;
}

const DEFAULT_WHERE_EXPRESSIONS = {
	$and: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) =>
			`(${operand.map(evaluate).join(" AND ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$or: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `(${operand.map(evaluate).join(" OR ")})`,
		vars: (operand, { evaluate }) => operand.flatMap(evaluate),
	},
	$not: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => `NOT (${evaluate(operand)})`,
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$eq: {
		where: () => " = ?",
		vars: (operand) => operand,
	},
	$gt: {
		where: () => " > ?",
		vars: (operand) => operand,
	},
	$gte: {
		where: () => " >= ?",
		vars: (operand) => operand,
	},
	$lt: {
		where: () => " < ?",
		vars: (operand) => operand,
	},
	$lte: {
		where: () => " <= ?",
		vars: (operand) => operand,
	},
	$ne: {
		where: () => " != ?",
		vars: (operand) => operand,
	},
	$in: {
		where: (operand) => ` IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$nin: {
		where: (operand) => ` NOT IN (${operand.map(() => "?").join(",")})`,
		vars: (operand) => operand,
	},
	$get: {
		where: (operand) => esToolkit.snakeCase(operand),
		vars: () => [],
	},
	$pipe: {
		where: (operand, { evaluate }) => operand.map(evaluate).join(""),
		vars: (operand, { evaluate }) => operand.map(evaluate).flat(),
	},
	$compose: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
		vars: (operand, { evaluate }) => evaluate({ $pipe: operand.toReversed() }),
	},
	$literal: {
		where: (operand) => String(operand),
		vars: () => [],
		controlsEvaluation: true,
	},
	$if: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const condition = evaluate(operand.if);
			const thenClause = isExpression(operand.then)
				? evaluate(operand.then)
				: "?";
			const elseClause = isExpression(operand.else)
				? evaluate(operand.else)
				: "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const ifResult = evaluate(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = evaluate(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = evaluate(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
	$case: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const value = isExpression(operand.value) ? evaluate(operand.value) : "?";
			let sql = `CASE ${value}`;

			for (const caseItem of operand.cases) {
				const whenClause = isExpression(caseItem.when)
					? evaluate(caseItem.when)
					: "?";
				const thenClause = isExpression(caseItem.then)
					? evaluate(caseItem.then)
					: "?";
				sql += ` WHEN ${whenClause} THEN ${thenClause}`;
			}

			const defaultClause = isExpression(operand.default)
				? evaluate(operand.default)
				: "?";
			sql += ` ELSE ${defaultClause} END`;

			return sql;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const vars = [];

			if (isExpression(operand.value)) {
				vars.push(...evaluate(operand.value));
			} else {
				vars.push(operand.value);
			}

			for (const caseItem of operand.cases) {
				if (isExpression(caseItem.when)) {
					vars.push(...evaluate(caseItem.when));
				} else {
					vars.push(caseItem.when);
				}
				if (isExpression(caseItem.then)) {
					vars.push(...evaluate(caseItem.then));
				} else {
					vars.push(caseItem.then);
				}
			}

			if (isExpression(operand.default)) {
				vars.push(...evaluate(operand.default));
			} else {
				vars.push(operand.default);
			}

			return vars.flat();
		},
	},
	$debug: {
		controlsEvaluation: true,
		where: (operand, { evaluate }) => evaluate(operand),
		vars: (operand, { evaluate }) => evaluate(operand),
	},
	$matchesLike: {
		name: "$matchesLike",
		where: () => " LIKE ?",
		vars: (operand) => operand,
	},
	$matchesGlob: {
		where: () => {
			throw new core.ExpressionNotSupportedError(
				"$matchesGlob",
				"store",
				"glob support is distinct to each SQL store",
			);
		},
		vars: () => {
			throw new core.ExpressionNotSupportedError(
				"$matchesGlob",
				"store",
				"glob support is distinct to each SQL store",
			);
		},
	},
	$matchesRegex: {
		where: () => {
			throw new core.ExpressionNotSupportedError(
				"$matchesRegex",
				"store",
				"regex support is distinct to each SQL store",
			);
		},
		vars: () => {
			throw new core.ExpressionNotSupportedError(
				"$matchesRegex",
				"store",
				"regex support is distinct to each SQL store",
			);
		},
	},
};

const DEFAULT_SELECT_EXPRESSIONS = {
	$if: {
		controlsEvaluation: true,
		where: (operand, { evaluate, isExpression }) => {
			const condition = evaluate(operand.if);
			const thenClause = isExpression(operand.then)
				? evaluate(operand.then)
				: "?";
			const elseClause = isExpression(operand.else)
				? evaluate(operand.else)
				: "?";
			return `CASE WHEN ${condition} THEN ${thenClause} ELSE ${elseClause} END`;
		},
		vars: (operand, { evaluate, isExpression }) => {
			const ifResult = evaluate(operand.if);
			const vars =
				Array.isArray(ifResult) && ifResult.length > 0 ? ifResult : [];
			if (isExpression(operand.then)) {
				const thenResult = evaluate(operand.then);
				vars.push(...(Array.isArray(thenResult) ? thenResult : [thenResult]));
			} else {
				vars.push(operand.then);
			}
			if (isExpression(operand.else)) {
				const elseResult = evaluate(operand.else);
				vars.push(...(Array.isArray(elseResult) ? elseResult : [elseResult]));
			} else {
				vars.push(operand.else);
			}
			return vars.flat();
		},
	},
};

/**
 * @typedef {Object} ColumnModifier
 * @property {(val: any) => any} extract - Function to extract/parse stored value
 * @property {(col: string) => string} select - Function to generate SQL for selecting value
 * @property {(val: any) => any} [store] - Function to transform value before storing (optional)
 */

/**
 * Base column type modifiers shared across SQL stores
 * @type {Object<string, ColumnModifier>}
 */
const baseColumnTypeModifiers = {
	geojson: {
		extract: (val) => JSON.parse(val),
		select: (val) => `ST_AsGeoJSON(${val})`,
	},
};

/**
 * Creates column type modifiers with custom type handlers
 * @param {Object<string, ColumnModifier>} [customModifiers={}] - Custom type modifiers
 * @returns {Object<string, ColumnModifier>} Combined column type modifiers
 */
function createColumnTypeModifiers(customModifiers = {}) {
	return {
		...baseColumnTypeModifiers,
		...customModifiers,
	};
}

/**
 * Transforms values for storage using column type modifiers
 * @param {any[]} values - Array of values to transform
 * @param {string[]} attributeNames - Array of attribute names corresponding to values
 * @param {import('data-prism').ResourceSchema} resourceSchema - Resource schema
 * @param {Object<string, ColumnModifier>} columnTypeModifiers - Column type modifiers
 * @returns {any[]} Transformed values ready for storage
 */
function transformValuesForStorage(
	values,
	attributeNames,
	resourceSchema,
	columnTypeModifiers,
) {
	return values.map((value, index) => {
		const attrName = attributeNames[index];
		const attrSchema = resourceSchema.attributes[attrName];
		const modifier = columnTypeModifiers[attrSchema?.type];

		return modifier?.store ? modifier.store(value) : value;
	});
}

/**
 * @typedef {Object} RelationshipContext
 * @property {import('data-prism').Schema} schema - The schema
 * @property {Object} config - Store configuration
 * @property {string} resourceType - The resource type
 * @property {string} resourceId - The resource ID
 */

/**
 * @typedef {Object} DatabaseOperations
 * @property {Function} clearForeignKey - Clear foreign key operation: (table, column, id) => void|Promise<void>
 * @property {Function} updateForeignKey - Update foreign key operation: (table, column, resourceId, idAttr, targetId) => void|Promise<void>
 * @property {Function} insertManyToMany - Insert many-to-many relationship: (table, localCol, foreignCol, localId, foreignId) => void|Promise<void>
 * @property {Function} deleteManyToMany - Delete many-to-many relationships: (table, column, id) => void|Promise<void>
 */

/**
 * Gets foreign (to-one) relationships from a resource
 * @param {Object} resource - The resource with relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Foreign relationships
 */
function getForeignRelationships(resource, joins) {
	return esToolkit.pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k]?.foreignColumn,
	);
}

/**
 * Gets many-to-many relationships from a resource
 * @param {Object} resource - The resource with relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Many-to-many relationships
 */
function getManyToManyRelationships(resource, joins) {
	return esToolkit.pickBy(resource.relationships ?? {}, (_, k) => joins[k]?.joinTable);
}

/**
 * Gets metadata for a foreign relationship
 * @param {string} relName - Relationship name
 * @param {string} resourceType - Current resource type
 * @param {RelationshipContext} context - Relationship context
 * @returns {Object} Relationship metadata
 */
function getForeignRelationshipMeta(relName, resourceType, context) {
	const { schema, config } = context;
	const resSchema = schema.resources[resourceType];
	const resConfig = config.resources[resourceType];

	const { foreignColumn } = resConfig.joins[relName];
	const foreignResourceType = resSchema.relationships[relName].type;
	const foreignIdAttribute =
		schema.resources[foreignResourceType].idAttribute ?? "id";
	const foreignTable = config.resources[foreignResourceType].table;

	return {
		foreignColumn,
		foreignIdAttribute,
		foreignTable,
		foreignResourceType,
	};
}

/**
 * Gets metadata for a many-to-many relationship
 * @param {string} relName - Relationship name
 * @param {string} resourceType - Current resource type
 * @param {RelationshipContext} context - Relationship context
 * @returns {Object} Relationship metadata
 */
function getManyToManyRelationshipMeta(relName, resourceType, context) {
	const { config } = context;
	const resConfig = config.resources[resourceType];

	const { joinTable, localJoinColumn, foreignJoinColumn } =
		resConfig.joins[relName];

	return {
		joinTable,
		localJoinColumn,
		foreignJoinColumn,
	};
}

/**
 * Processes foreign (to-one) relationships
 * @param {Object} resource - The resource with relationships
 * @param {RelationshipContext} context - Relationship context
 * @param {DatabaseOperations} dbOps - Database operations
 * @returns {Promise<void>|void}
 */
function processForeignRelationships(resource, context, dbOps) {
	const { config } = context;
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

	const foreignRelationships = getForeignRelationships(resource, joins);

	const operations = Object.entries(foreignRelationships)
		.map(([relName, val]) => {
			const meta = getForeignRelationshipMeta(relName, resource.type, context);

			// Clear existing foreign key references
			const clearOp = dbOps.clearForeignKey(
				meta.foreignTable,
				meta.foreignColumn,
				context.resourceId,
			);

			// Set new foreign key references
			const updateOps = val.map((v) =>
				dbOps.updateForeignKey(
					meta.foreignTable,
					meta.foreignColumn,
					context.resourceId,
					esToolkit.snakeCase(meta.foreignIdAttribute),
					v.id,
				),
			);

			return [clearOp, ...updateOps];
		})
		.flat();

	// Handle both sync and async operations
	if (operations.some((op) => op && typeof op.then === "function")) {
		return Promise.all(operations.filter((op) => op));
	}
}

/**
 * Processes many-to-many relationships
 * @param {Object} resource - The resource with relationships
 * @param {RelationshipContext} context - Relationship context
 * @param {DatabaseOperations} dbOps - Database operations
 * @returns {Promise<void>|void}
 */
function processManyToManyRelationships(resource, context, dbOps) {
	const { config, resourceId } = context;
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

	const m2mRelationships = getManyToManyRelationships(resource, joins);

	const operations = Object.entries(m2mRelationships)
		.map(([relName, val]) => {
			const meta = getManyToManyRelationshipMeta(
				relName,
				resource.type,
				context,
			);

			const ops = [];

			// Clear existing relationships (for update operations)
			if (context.clearExisting) {
				ops.push(
					dbOps.deleteManyToMany(
						meta.joinTable,
						meta.localJoinColumn,
						resourceId,
					),
				);
			}

			// Insert new relationships
			val.forEach((v) => {
				ops.push(
					dbOps.insertManyToMany(
						meta.joinTable,
						meta.localJoinColumn,
						meta.foreignJoinColumn,
						resourceId,
						v.id,
					),
				);
			});

			return ops;
		})
		.flat();

	// Handle both sync and async operations
	if (operations.some((op) => op && typeof op.then === "function")) {
		return Promise.all(operations.filter((op) => op));
	}
}

/**
 * Transforms attribute names from camelCase to snake_case for database columns
 * @param {Object} attributes - Resource attributes object
 * @returns {string[]} Array of snake_case column names
 */
function getAttributeColumns(attributes) {
	return Object.keys(attributes ?? {}).map(esToolkit.snakeCase);
}

/**
 * Gets local relationship data filtered by join configuration
 * @param {Object} relationships - Resource relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Local relationships
 */
function getLocalRelationships(relationships, joins) {
	return esToolkit.pickBy(relationships ?? {}, (_, k) => joins[k]?.localColumn);
}

/**
 * Gets relationship columns for local relationships
 * @param {Object} localRelationships - Local relationships
 * @param {Object} joinConfig - Join configuration for the resource
 * @returns {string[]} Array of relationship column names
 */
function getRelationshipColumns(localRelationships, joinConfig) {
	return Object.keys(localRelationships).map(
		(r) => joinConfig.joins[r].localColumn,
	);
}

/**
 * Gets ID columns with proper snake_case transformation
 * @param {string} resourceId - Resource ID (optional)
 * @param {string} idAttribute - ID attribute name
 * @returns {string[]} Array of ID column names
 */
function getIdColumns(resourceId, idAttribute) {
	return resourceId ? [esToolkit.snakeCase(idAttribute)] : [];
}

/**
 * Gets ID values array
 * @param {string} resourceId - Resource ID (optional)
 * @returns {string[]} Array of ID values
 */
function getIdValues(resourceId) {
	return resourceId ? [resourceId] : [];
}

/**
 * Transforms database row keys from snake_case to camelCase
 * @param {Object} row - Database row object
 * @returns {Object} Transformed object with camelCase keys
 */
function transformRowKeys(row) {
	const transformed = {};
	Object.entries(row).forEach(([k, v]) => {
		transformed[esToolkit.camelCase(k)] = v;
	});
	return transformed;
}

/**
 * Builds a complete resource object from database data
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} attributes - Resource attributes (already camelCase)
 * @param {Object} relationships - Resource relationships
 * @param {import('data-prism').ResourceSchema} resourceSchema - Resource schema
 * @returns {Object} Complete resource object
 */
function buildResourceObject(
	resourceType,
	resourceId,
	attributes,
	relationships,
	resourceSchema,
) {
	return {
		type: resourceType,
		id: resourceId,
		attributes: esToolkit.pick(attributes, Object.keys(resourceSchema.attributes)),
		relationships: relationships ?? {},
	};
}

/**
 * Prepares values for database insertion/update
 * @param {Object} resource - Resource object
 * @param {Object} localRelationships - Local relationships
 * @param {string[]} idValues - ID values array
 * @returns {Object} Prepared values object
 */
function prepareValuesForStorage(
	resource,
	localRelationships,
	idValues,
) {
	const attributeValues = Object.values(resource.attributes ?? {});
	const relationshipValues = Object.values(localRelationships).map(
		(r) => r?.id ?? null,
	);

	return {
		attributeValues,
		relationshipValues,
		idValues,
		allValues: [...attributeValues, ...relationshipValues, ...idValues],
	};
}

/**
 * Creates column arrays for SQL operations
 * @param {Object} resource - Resource object
 * @param {Object} localRelationships - Local relationships
 * @param {string} idAttribute - ID attribute name
 * @param {Object} joinConfig - Join configuration
 * @param {boolean} includeId - Whether to include ID columns
 * @returns {Object} Column configuration object
 */
function createColumnConfiguration(
	resource,
	localRelationships,
	idAttribute,
	joinConfig,
	includeId = true,
) {
	const attributeColumns = getAttributeColumns(resource.attributes);
	const relationshipColumns = getRelationshipColumns(
		localRelationships,
		joinConfig,
	);
	const idColumns = includeId ? [esToolkit.snakeCase(idAttribute)] : [];

	return {
		attributeColumns,
		relationshipColumns,
		idColumns,
		allColumns: [...attributeColumns, ...relationshipColumns, ...idColumns],
	};
}

/**
 * Creates SQL placeholders string
 * @param {number} count - Number of placeholders needed
 * @param {string} placeholder - Placeholder character (default: "?")
 * @returns {string} Comma-separated placeholders
 */
function createPlaceholders(count, placeholder = "?") {
	return Array(count).fill(placeholder).join(", ");
}

/**
 * Creates SQL SET clause for UPDATE operations
 * @param {string[]} columns - Column names
 * @param {string} placeholder - Placeholder character (default: "?")
 * @returns {string} SET clause string
 */
function createUpdateSetClause(columns, placeholder = "?") {
	return columns.map((col) => `${col} = ${placeholder}`).join(", ");
}

/**
 * Creates SQL conflict clause for UPSERT operations
 * @param {string[]} updateColumns - Columns to update on conflict
 * @returns {string} Conflict clause string
 */
function createUpsertConflictClause(updateColumns) {
	return updateColumns.length === 0
		? "DO NOTHING"
		: `DO UPDATE SET ${updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(", ")}`;
}

exports.DEFAULT_SELECT_EXPRESSIONS = DEFAULT_SELECT_EXPRESSIONS;
exports.DEFAULT_WHERE_EXPRESSIONS = DEFAULT_WHERE_EXPRESSIONS;
exports.baseColumnTypeModifiers = baseColumnTypeModifiers;
exports.baseConstraintOperatorDefinitions = baseConstraintOperatorDefinitions;
exports.baseSqlExpressions = baseSqlExpressions;
exports.buildResourceObject = buildResourceObject;
exports.createColumnConfiguration = createColumnConfiguration;
exports.createColumnTypeModifiers = createColumnTypeModifiers;
exports.createConstraintOperators = createConstraintOperators;
exports.createPlaceholders = createPlaceholders;
exports.createUpdateSetClause = createUpdateSetClause;
exports.createUpsertConflictClause = createUpsertConflictClause;
exports.extractGraph = extractGraph;
exports.extractQueryClauses = extractQueryClauses;
exports.flatMapQuery = flatMapQuery;
exports.flattenQuery = flattenQuery;
exports.forEachQuery = forEachQuery;
exports.getAttributeColumns = getAttributeColumns;
exports.getForeignRelationshipMeta = getForeignRelationshipMeta;
exports.getForeignRelationships = getForeignRelationships;
exports.getIdColumns = getIdColumns;
exports.getIdValues = getIdValues;
exports.getLocalRelationships = getLocalRelationships;
exports.getManyToManyRelationshipMeta = getManyToManyRelationshipMeta;
exports.getManyToManyRelationships = getManyToManyRelationships;
exports.getRelationshipColumns = getRelationshipColumns;
exports.makeRelationshipBuilders = makeRelationshipBuilders;
exports.preQueryRelationships = preQueryRelationships;
exports.prepareValuesForStorage = prepareValuesForStorage;
exports.processForeignRelationships = processForeignRelationships;
exports.processManyToManyRelationships = processManyToManyRelationships;
exports.someQuery = someQuery;
exports.transformRowKeys = transformRowKeys;
exports.transformValuesForStorage = transformValuesForStorage;
