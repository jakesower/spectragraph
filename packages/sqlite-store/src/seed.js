import { applyOrMap } from "@data-prism/utils";
import { groupBy, mapValues, uniqBy, snakeCase } from "lodash-es";

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
		const { idAttribute = "id", table } = resConfig;

		const idCol = { name: snakeCase(idAttribute), type: "VARCHAR" };
		const attrCols = Object.entries(resDef.attributes)
			.filter(([attrName]) => attrName !== idAttribute)
			.map(([attrName, attrDef]) => ({
				name: snakeCase(attrName),
				type: defaultColumnTypes[attrDef.type],
			}));
		const joinCols = Object.values(resConfig.joins)
			.filter((j) => j.localColumn)
			.map((j) => ({ name: j.localColumn, type: "VARCHAR" }));

		const allCols = [idCol, ...attrCols, ...joinCols];

		const sql = `CREATE TABLE ${table} (${allCols
			.map((col) => `${col.name} ${col.type}`)
			.join(", ")})`;

		db.exec(sql);
	});

	const joinTableConfigs = Object.values(config.resources).flatMap(
		(resConfig) =>
			Object.values(resConfig.joins).filter(
				(resJoinConfig) => resJoinConfig.joinTable,
			),
	);
	const joinTables = groupBy(
		Object.values(joinTableConfigs),
		(jtc) => jtc.joinTable,
	);
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

		const idAttribute = resConfig.idAttribute ?? "id";
		const attrs = Object.entries(resDef.attributes)
			.filter(([attrName]) => attrName !== idAttribute)
			.map(([attrName, attrDef]) =>
				attrDef.type === "boolean"
					? (res) => boolToNum(res.attributes[attrName])
					: (res) => res.attributes[attrName],
			);
		const joins = Object.entries(resConfig.joins)
			.filter(([, j]) => j.localColumn)
			.map(
				([joinAttr]) =>
					(res) =>
						applyOrMap(res.relationships[joinAttr], ({ id }) => id),
			);

		return [...attrs, ...joins];
	});

	Object.entries(seedData).forEach(([resType, resources]) => {
		const { table } = config.resources[resType];
		const tableConfig = tableConfigs[resType];
		const placeholders = ["id", ...tableConfig].map(() => "?");
		const sql = `INSERT INTO ${table} VALUES (${placeholders})`;
		const dbQuery = db.prepare(sql);

		Object.entries(resources).forEach(([id, resource]) => {
			const values = tableConfig.map((fn) => fn(resource));

			dbQuery.run([id, ...values]);
		});
	});

	const allJoinTableConfigs = Object.entries(config.resources).flatMap(
		([resType, resConfig]) =>
			Object.entries(resConfig.joins)
				.filter(([, resJoinConfig]) => resJoinConfig.joinTable)
				.map(([relName, join]) => ({
					table: join.joinTable,
					resourceType: resType,
					attribute: relName,
					localColumn: join.localJoinColumn,
					foreignColumn: join.foreignJoinColumn,
				})),
	);
	const joinTableConfigs = uniqBy(allJoinTableConfigs, (j) => j.table);

	joinTableConfigs.forEach((join) => {
		const { table, resourceType, attribute, localColumn, foreignColumn } = join;
		const sql = `INSERT INTO ${table} VALUES (?,?)`;
		const dbQuery = db.prepare(sql);

		Object.entries(seedData[resourceType]).forEach(([localId, resource]) => {
			resource.relationships[attribute].forEach(({ id: foreignId }) => {
				const values =
					localColumn < foreignColumn
						? [localId, foreignId]
						: [foreignId, localId];

				dbQuery.run(values);
			});
		});
	});
}
