import { partition, pick, last, snakeCase, mapValues, uniq } from 'lodash-es';

/**
 * @typedef {Object} QueryBreakdownItem
 * @property {string[]} path - Path to this query level
 * @property {any} attributes - Selected attributes
 * @property {any} relationships - Selected relationships
 * @property {string} type - Resource type
 * @property {import('@data-prism/core').Query} query - The query object
 * @property {boolean} ref - Whether this is a reference-only query
 * @property {import('@data-prism/core').Query|null} parentQuery - Parent query if any
 * @property {QueryBreakdownItem|null} parent - Parent breakdown item if any
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
 * Reduces over each query in a flattened query structure
 * @param {import('@data-prism/core').Schema} schema - The schema
 * @param {import('@data-prism/core').RootQuery} query - The root query
 * @param {(acc: any, query: import('@data-prism/core').Query, info: QueryBreakdownItem) => any} fn - Reducer function
 * @param {any} initVal - Initial value
 * @returns {any} Reduced result
 */
function reduceQuery(schema, query, fn, initVal) {
	return flattenQuery(schema, query).reduce(
		(acc, q) => fn(acc, q.query, q),
		initVal,
	);
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
 * Replaces ? placeholders with PostgreSQL $n placeholders
 * @param {string} inputString - Input SQL string with ? placeholders
 * @returns {string} SQL string with $n placeholders
 */
function replacePlaceholders(inputString) {
	let counter = 1;
	return inputString.replace(/\?/g, () => `$${counter++}`);
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
	const relName = last(queryPath);

	const relationshipBuilders = makeRelationshipBuilders(schema);
	const localQueryTableName = parentTablePath.join("$");

	const localConfig = config.resources[parent.type];
	const localResSchema = schema.resources[parent.type];
	const localIdCol = snakeCase(localResSchema.idAttribute ?? "id");
	const localRelDef = localResSchema.relationships[relName];

	const foreignConfig = config.resources[localRelDef.type];
	const foreignResSchema = schema.resources[localRelDef.type];
	const foreignIdCol = snakeCase(foreignResSchema.idAttribute ?? "id");
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
	return mapValues(operatorDefinitions, (definition) => ({
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
		name: "$and",
		where: (operand) => operand.join(" AND "),
		vars: (operand) => operand.flat(),
	},
	$eq: {
		name: "$equal",
		where: (operand) => `${operand[0]} = ?`,
		vars: (operand) => operand[1],
	},
	$gt: {
		name: "$gt",
		where: (operand) => `${operand[0]} > ?`,
		vars: (operand) => operand[1],
	},
	$gte: {
		name: "$gte",
		where: (operand) => `${operand[0]} >= ?`,
		vars: (operand) => operand[1],
	},
	$lt: {
		name: "$lt",
		where: (operand) => `${operand[0]} < ?`,
		vars: (operand) => operand[1],
	},
	$lte: {
		name: "$lte",
		where: (operand) => `${operand[0]} <= ?`,
		vars: (operand) => operand[1],
	},
	$ne: {
		name: "$ne",
		where: (operand) => `${operand[0]} != ?`,
		vars: (operand) => operand[1],
	},
	$in: {
		name: "$in",
		where: (operand) =>
			`${operand[0]} IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$nin: {
		name: "$nin",
		where: (operand) =>
			`${operand[0]} NOT IN (${operand[1].map(() => "?").join(",")})`,
		vars: (operand) => operand[1],
	},
	$or: {
		name: "$or",
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
	const graph = mapValues(schema.resources, () => ({}));

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
		const idPath = `${rootQuery.type}${pathStr}.${snakeCase(idAttribute)}`;
		const idIdx = selectAttributeMap[idPath];

		return (result) => {
			const id = result[idIdx];

			if (parentQuery) {
				const parentResSchema = schema.resources[parentType];
				const parentId =
					result[
						selectAttributeMap[
							`${rootQuery.type}${buildParentPath(info.path)}.${snakeCase(
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
							`${rootQuery.type}${pathStr}.${snakeCase(attr)}`
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
			where: [`${queryInfo.type}.${snakeCase(idAttribute)} = ?`],
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
			select: uniq([idAttribute, ...attributeProps]).map((col) => {
				const attrSchema = resSchema.attributes[col];
				const value = `${table}.${snakeCase(col)}`;

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

export { baseConstraintOperatorDefinitions, baseSqlExpressions, createConstraintOperators, extractGraph, extractQueryClauses, flatMapQuery, flattenQuery, forEachQuery, makeRelationshipBuilders, preQueryRelationships, reduceQuery, replacePlaceholders, someQuery };
