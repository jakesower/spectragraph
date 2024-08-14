import { applyOrMap } from "@data-prism/utils";
import { groupBy, snakeCase, uniqBy } from "lodash-es";

const defaultColumnTypes = {
	boolean: "boolean",
	integer: "integer",
	number: "real",
	object: "json",
	string: "text",
};

export function createTablesSQL(schema, config) {
	const output = [];

	Object.entries(schema.resources).forEach(([resType, resDef]) => {
		const resConfig = config.resources[resType];
		const { idAttribute = "id", table } = resConfig;

		const idCol = {
			name: snakeCase(idAttribute),
			type: resConfig.idType ?? "uuid",
		};
		const attrCols = Object.entries(resDef.attributes)
			.filter(([attrName]) => attrName !== idAttribute)
			.map(([attrName, attrDef]) => ({
				name: snakeCase(attrName),
				type: defaultColumnTypes[attrDef.type],
			}));
		const joinCols = Object.values(resConfig.joins)
			.filter((j) => j.localColumn)
			.map((j) => ({ name: j.localColumn, type: j.localColumnType ?? "uuid" }));

		const allCols = [...attrCols, ...joinCols];

		const sql = `CREATE TABLE ${table} (${idCol.name} ${
			idCol.type
		} PRIMARY KEY, ${allCols
			.map((col) => `${col.name} ${col.type}`)
			.join(", ")});`;

		output.push(sql);
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
		const joinCols = jt.map((j) => `${j.localJoinColumn} ${j.localColumnType}`);
		joinCols.sort();

		const sql = `CREATE TABLE ${joinTable} (${joinCols.join(", ")});`;

		output.push(sql);
	});

	return output.join("\n");
}

export async function seed(db, schema, config, seedData) {
	await Promise.all(
		Object.entries(seedData).flatMap(([resType, resources]) => {
			const { table } = config.resources[resType];
			const resConfig = config.resources[resType];
			const resSchema = schema.resources[resType];

			const idAttribute = resConfig.idAttribute ?? "id";
			const attributes = Object.entries(resSchema.attributes)
				.filter(([attrName]) => attrName !== idAttribute)
				.map(([attrName]) => ({
					column: snakeCase(attrName),
					value: (res) => res.attributes[attrName],
				}));

			const joins = Object.entries(resConfig.joins)
				.filter(([_, j]) => j.localColumn)
				.map(([joinAttr, j]) => ({
					column: j.localColumn,
					value: (res) =>
						applyOrMap(res.relationships[joinAttr], ({ id }) => id),
				}));

			const nonIdColumns = [...attributes, ...joins];

			const placeholders = [idAttribute, ...attributes, ...joins]
				.map((_, idx) => `$${idx + 1}`)
				.join(", ");
			const colNames = nonIdColumns.map((c) => c.column).join(", ");

			const sql = `INSERT INTO ${table} (${snakeCase(
				idAttribute,
			)}, ${colNames}) VALUES (${placeholders})`;

			return Promise.all(
				Object.entries(resources).map(([id, resource]) => {
					const values = nonIdColumns.map((col) => col.value(resource));
					return db.query(sql, [id, ...values]);
				}),
			);
		}),
	);

	const allJoinTableConfigs = Object.entries(config.resources).flatMap(
		([resType, resConfig]) =>
			Object.entries(resConfig.joins)
				.filter(([_, resJoinConfig]) => resJoinConfig.joinTable)
				.map(([relName, join]) => ({
					table: join.joinTable,
					resourceType: resType,
					attribute: relName,
					localColumn: join.localJoinColumn,
					foreignColumn: join.foreignJoinColumn,
				})),
	);
	const joinTableConfigs = uniqBy(allJoinTableConfigs, (j) => j.table);

	await Promise.all(
		joinTableConfigs.flatMap((join) => {
			const { table, resourceType, attribute, localColumn, foreignColumn } =
				join;
			const sql = `INSERT INTO ${table} (${localColumn}, ${foreignColumn}) VALUES ($1, $2)`;

			return Promise.all(
				Object.entries(seedData[resourceType]).map(([localId, resource]) =>
					resource.relationships[attribute].map(({ id: foreignId }) =>
						db.query(sql, [localId, foreignId]),
					),
				),
			);
		}),
	);
}

export async function reset(db, schema, config, seedData) {
	await Promise.all(
		Object.values(config.resources).map((resConfig) => {
			const table = resConfig.table;
			const joinTables = Object.values(resConfig.joins)
				.map((j) => j.joinTable)
				.filter(Boolean);

			return Promise.all(
				[table, ...joinTables].map((t) =>
					db.query(`DROP TABLE IF EXISTS ${t}`),
				),
			);
		}),
	);

	const createSQL = createTablesSQL(schema, config);
	await db.query(createSQL);

	await seed(db, schema, config, seedData);
}
