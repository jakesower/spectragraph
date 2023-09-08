import { get, last, uniq } from "lodash-es";

function makeRelBuilders(schema) {
	return {
		one: {
			one(props) {
				const {
					foreignConfig,
					foreignTableAlias,
					localConfig,
					localQueryTableName,
					relName,
				} = props;

				const { localColumn } = localConfig.joins[relName];
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localColumn} = ${foreignTableAlias}.id`,
				];
			},
			many(props) {
				const {
					foreignConfig,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
				} = props;

				const foreignTable = foreignConfig.table;
				const foreignJoinColumn = localConfig.joins[relName].foreignColumn;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.id = ${foreignTableAlias}.${foreignJoinColumn}`,
				];
			},
		},
		many: {
			one(props) {
				const {
					localConfig,
					localQueryTableName,
					relName,
					foreignConfig,
					foreignTableAlias,
				} = props;

				const localJoinColumn = localConfig.joins[relName].localColumn;
				const foreignTable = foreignConfig.table;

				return [
					`LEFT JOIN ${foreignTable} AS ${foreignTableAlias} ON ${localQueryTableName}.${localJoinColumn} = ${foreignTableAlias}.id`,
				];
			},
			many(props) {
				const {
					foreignConfig,
					localConfig,
					localQueryTableName,
					relName,
					foreignTableAlias,
				} = props;

				const localIdCol = localConfig.idProperty ?? "id";

				const foreignTable = foreignConfig.table;
				const foreignIdCol = foreignConfig.idProperty ?? "id";

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
			// one({ localResDef, localTableAlias, relName, path }) {
			//   // TODO
			// },
			many({ localResDef, localQueryTableName, relName, foreignTableAlias }) {
				const localRelDef = localResDef.properties[relName];
				const localJoinColumn = localRelDef.store.join.joinColumn;

				const foreignResDef = schema.resources[localRelDef.relatedType];
				const foreignTable = foreignResDef.store.table;
				const foreignRelDef = foreignResDef?.properties?.[localRelDef.inverse];
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
	const { config, flatQuery, queryPath, rootQuery, schema } = context;
	const { parent } = flatQuery;
	const rootTable = config.resources[rootQuery.type].table;

	if (queryPath.length === 0) return {};

	const parentPath = queryPath.slice(0, -1);
	const tablePath = [rootTable, ...queryPath];
	const parentTablePath = [rootTable, ...parentPath];
	const relName = last(queryPath);

	const relBuilders = makeRelBuilders(schema);
	const localQueryTableName = parentTablePath.join("$");

	const localConfig = config.resources[parent.type];
	const localResDef = schema.resources[parent.type];
	const localRelDef = localResDef.relationships[relName];

	const foreignConfig = config.resources[localRelDef.resource];
	const foreignResDef = schema.resources[localRelDef.resource];
	const foreignRelDef = foreignResDef.relationships[localRelDef.inverse];
	const foreignTableAlias = tablePath.join("$");

	const localResCardinality = localRelDef.cardinality;
	const foreignResCardinality = foreignRelDef?.cardinality ?? "none";

	const builderArgs = {
		localConfig,
		localRelDef,
		localResDef,
		localQueryTableName,
		relName,
		foreignConfig,
		foreignTableAlias,
	};

	const join = relBuilders[foreignResCardinality][localResCardinality](builderArgs);

	return { join };
};
