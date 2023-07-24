import { groupBy, mapValues, uniq, uniqBy } from "lodash-es";

const boolToNum = (val) => (val === true ? 1 : val === false ? 0 : val) ?? null;
const defaultColumnTypes = {
	boolean: "INTEGER",
	integer: "INTEGER",
	number: "REAL",
	string: "VARCHAR",
};

export function createTables(db, schema, config) {
	Object.entries(schema.resources).forEach(([resType, resDef]) => {
		const resConfig = config.resources[resType];
		const { idProperty = "id", table } = resConfig;

		const idCol = { name: idProperty, type: "VARCHAR" };
		const propCols = Object.entries(resDef.properties).map(([propName, propDef]) => ({
			name: propName,
			type: defaultColumnTypes[propDef.type],
		}));
		const joinCols = Object.values(resConfig.joins)
			.filter((j) => j.localColumn)
			.map((j) => ({ name: j.localColumn, type: "VARCHAR" }));

		const allCols = [idCol, ...propCols, ...joinCols];

		const sql = `CREATE TABLE ${table} (${allCols
			.map((col) => `${col.name} ${col.type}`)
			.join(", ")})`;

		db.exec(sql);
	});

	const joinTableConfigs = Object.values(config.resources).flatMap((resConfig) =>
		Object.values(resConfig.joins).filter((resJoinConfig) => resJoinConfig.joinTable),
	);
	const joinTables = groupBy(Object.values(joinTableConfigs), (jtc) => jtc.joinTable);
	Object.entries(joinTables).forEach(([joinTable, jt]) => {
		const joinCols = jt.map((j) => j.localJoinColumn);
		joinCols.sort();

		const sql = `CREATE TABLE ${joinTable} (${joinCols
			.map((jc) => `${jc} VARCHAR`)
			.join(", ")})`;

		db.exec(sql);
	});
}

export function seed(db, schema, config, seedData) {
	const tableConfigs = mapValues(schema.resources, (resDef, resType) => {
		const resConfig = config.resources[resType];

		const id = (res) => res[resConfig.idProperty ?? "id"];
		const props = Object.entries(resDef.properties).map(([propName, propDef]) =>
			propDef.type === "boolean"
				? (res) => boolToNum(res[propName])
				: (res) => res[propName],
		);
		const joins = Object.entries(resConfig.joins)
			.filter(([_, j]) => j.localColumn)
			.map(
				([joinProp]) =>
					(res) =>
						res[joinProp],
			);

		return [id, ...props, ...joins];
	});

	Object.entries(seedData).forEach(([resType, resources]) => {
		const { table } = config.resources[resType];
		const tableConfig = tableConfigs[resType];
		const placeholders = tableConfig.map(() => "?");
		const sql = `INSERT INTO ${table} VALUES (${placeholders})`;
		const dbQuery = db.prepare(sql);

		Object.values(resources).forEach((resource) => {
			const values = tableConfig.map((fn) => fn(resource));

			dbQuery.run(values);
		});
	});

	const allJoinTableConfigs = Object.entries(config.resources).flatMap(
		([resType, resConfig]) =>
			Object.entries(resConfig.joins)
				.filter(([_, resJoinConfig]) => resJoinConfig.joinTable)
				.map(([relName, join]) => ({
					table: join.joinTable,
					resourceType: resType,
					property: relName,
					localColumn: join.localJoinColumn,
					foreignColumn: join.foreignJoinColumn,
				})),
	);
	const joinTableConfigs = uniqBy(allJoinTableConfigs, (j) => j.table);

	joinTableConfigs.forEach((join) => {
		const { table, resourceType, property, localColumn, foreignColumn } = join;
		const sql = `INSERT INTO ${table} VALUES (?,?)`;
		const dbQuery = db.prepare(sql);

		Object.entries(seedData[resourceType]).forEach(([localId, resource]) => {
			resource[property].forEach((foreignId) => {
				const values =
					localColumn < foreignColumn ? [localId, foreignId] : [foreignId, localId];

				dbQuery.run(values);
			});
		});
	});
}
