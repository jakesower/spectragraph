import { partition, pick, last, snakeCase, mapValues } from 'lodash-es';

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

export { baseConstraintOperatorDefinitions, baseSqlExpressions, createConstraintOperators, flatMapQuery, flattenQuery, forEachQuery, makeRelationshipBuilders, preQueryRelationships, reduceQuery, replacePlaceholders, someQuery };
