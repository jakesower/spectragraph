import { last, snakeCase } from "es-toolkit";

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
export function makeRelationshipBuilders(schema) {
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
export const preQueryRelationships = (context) => {
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
