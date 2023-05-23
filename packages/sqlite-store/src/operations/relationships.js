import { get, last, uniq } from "lodash-es";

function makeRelBuilders(schema) {
	return {
		one: {
			one({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
				const outgoingRelDef = outgoingResDef.properties[relName];
				const outgoingJoinColumn = outgoingRelDef.store.join.localColumn;

				const incomingResDef = schema.resources[outgoingRelDef.relatedType];
				const incomingTable = incomingResDef.store.table;

				return [
					`LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.${outgoingJoinColumn} = ${incomingTableName}.id`,
				];
			},
			many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
				const outgoingRelDef = outgoingResDef.properties[relName];

				const incomingResDef = schema.resources[outgoingRelDef.relatedType];
				const incomingTable = incomingResDef.store.table;
				const incomingRelDef = incomingResDef.properties[outgoingRelDef.inverse];
				const incomingJoinColumn = incomingRelDef.store.join.localColumn;

				return [
					`LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.id = ${incomingTableName}.${incomingJoinColumn}`,
				];
			},
		},
		many: {
			one(props) {
				const {
					outgoingConfig,
					outgoingQueryTableName,
					relName,
					incomingConfig,
					incomingTableName,
				} = props;

				const outgoingJoinColumn = outgoingConfig.joins[relName].localColumn;
				const incomingTable = incomingConfig.table;

				return [
					`LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${outgoingQueryTableName}.${outgoingJoinColumn} = ${incomingTableName}.id`,
				];
			},
			many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
				const outgoingRelDef = outgoingResDef.properties[relName];
				const outgoingJoinColumn = outgoingRelDef.store.join.joinColumn;

				const incomingResDef = schema.resources[outgoingRelDef.relatedType];
				const incomingTable = incomingResDef.store.table;
				const incomingRelDef = incomingResDef.properties[outgoingRelDef.inverse];
				const incomingJoinColumn = incomingRelDef.store.join.joinColumn;

				const { joinTable } = outgoingRelDef.store.join;
				const joinTableName = `${outgoingQueryTableName}$$${relName}`;

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${outgoingQueryTableName}.id = ${joinTableName}.${outgoingJoinColumn}`,
					`LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${incomingTableName}.id = ${joinTableName}.${incomingJoinColumn}`,
				];
			},
		},
		none: {
			// one({ outgoingResDef, outgoingTableName, relName, path }) {
			//   // TODO
			// },
			many({ outgoingResDef, outgoingQueryTableName, relName, incomingTableName }) {
				const outgoingRelDef = outgoingResDef.properties[relName];
				const outgoingJoinColumn = outgoingRelDef.store.join.joinColumn;

				const incomingResDef = schema.resources[outgoingRelDef.relatedType];
				const incomingTable = incomingResDef.store.table;
				const incomingRelDef = incomingResDef?.properties?.[outgoingRelDef.inverse];
				const incomingJoinColumn = incomingRelDef
					? incomingRelDef.store.join.joinColumn
					: outgoingRelDef.store.join.foreignJoinColumn;

				const { joinTable } = outgoingRelDef.store.join;
				const joinTableName = `${outgoingQueryTableName}$$${relName}`;

				return [
					`LEFT JOIN ${joinTable} AS ${joinTableName} ON ${outgoingQueryTableName}.id = ${joinTableName}.${outgoingJoinColumn}`,
					`LEFT JOIN ${incomingTable} AS ${incomingTableName} ON ${incomingTableName}.id = ${joinTableName}.${incomingJoinColumn}`,
				];
			},
		},
	};
}

export const preQueryRelationships = (context) => {
	const { config, query, queryPath, rootQuery, schema } = context;
	const { parentQuery } = query;
	const rootTable = config.resources[rootQuery.type].table;

	if (queryPath.length === 0) return {};

	const parentPath = queryPath.slice(0, -1);
	const tablePath = [rootTable, ...queryPath];
	const parentTablePath = [rootTable, ...parentPath];
	const relName = last(queryPath);

	const relBuilders = makeRelBuilders(schema);
	const outgoingQueryTableName = parentTablePath.join("$");

	const outgoingConfig = config.resources[parentQuery.type];
	const outgoingResDef = schema.resources[parentQuery.type];
	const outgoingRelDef = outgoingResDef.relationships[relName];

	const incomingConfig = config.resources[outgoingRelDef.resource];
	const incomingResDef = schema.resources[outgoingRelDef.resource];
	const incomingRelDef = incomingResDef.relationships[outgoingRelDef.inverse];
	const incomingTableName = tablePath.join("$");

	const outgoingResCardinality = outgoingRelDef.cardinality;
	const incomingResCardinality = incomingRelDef?.cardinality ?? "none";

	const builderArgs = {
		outgoingConfig,
		outgoingResDef,
		outgoingQueryTableName,
		relName,
		incomingConfig,
		incomingTableName,
	};

	const join = relBuilders[incomingResCardinality][outgoingResCardinality](builderArgs);

	return { join };
};
