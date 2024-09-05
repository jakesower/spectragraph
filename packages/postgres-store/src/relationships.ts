import { last, snakeCase } from "lodash-es";

function makeRelBuilders(schema) {
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
					foreignResSchema,
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
			// one({ localResSchema, localTableAlias, relName, path }) {
			//   // TODO
			// },
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

export const preQueryRelationships = (context) => {
	const { config, queryInfo, rootQuery, schema } = context;
	const { parent, path: queryPath } = queryInfo;
	const rootTable = config.resources[rootQuery.type].table;

	if (queryPath.length === 0) return {};

	const parentPath = queryPath.slice(0, -1);
	const tablePath = [rootTable, ...queryPath];
	const parentTablePath = [rootTable, ...parentPath];
	const relName: string = last(queryPath);

	const relBuilders = makeRelBuilders(schema);
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
		relBuilders[foreignResCardinality][localResCardinality](builderArgs);

	return { join };
};
