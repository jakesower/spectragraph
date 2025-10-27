import { applyOrMap } from "@spectragraph/utils";
import { groupBy, snakeCase, uniqBy } from "es-toolkit";

const defaultColumnTypes = {
	array: "json",
	boolean: "boolean",
	date: "date",
	datetime: "timestamp",
	geojson: "geometry",
	integer: "integer",
	number: "real",
	object: "json",
	string: "text",
};

function replacePlaceholders(inputString) {
	let counter = 1;
	return inputString.replace(/\?/g, () => `$${counter++}`);
}

export function createTablesSQL(schema, config) {
	const output = [];

	Object.entries(schema.resources).forEach(([resType, resDef]) => {
		const resConfig = config.resources[resType];
		const { table } = resConfig;
		const { idAttribute = "id" } = resDef;

		const idCol = {
			name: snakeCase(idAttribute),
			type: resConfig.idType ?? "uuid",
		};
		const attrCols = Object.entries(resDef.attributes)
			.filter(([attrName]) => attrName !== idAttribute)
			.map(([attrName, attrDef]) => ({
				name: snakeCase(attrName),
				type:
					resConfig.columns?.[attrName]?.type ??
					(attrDef.format && defaultColumnTypes[attrDef.format]
						? defaultColumnTypes[attrDef.format]
						: defaultColumnTypes[attrDef.type]),
			}));
		const joinCols = Object.values(resConfig.joins ?? {})
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
			Object.values(resConfig.joins ?? {}).filter(
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
			const resConfig = config.resources[resType];
			const resSchema = schema.resources[resType];

			const { table } = resConfig;
			const idAttribute = resSchema.idAttribute ?? "id";

			const attributes = Object.entries(resSchema.attributes)
				.filter(([attrName]) => attrName !== idAttribute)
				.map(([attrName, attrSchema]) => ({
					column: snakeCase(attrName),
					placeholder:
						attrSchema.type === "geography" ? "ST_GeomFromGeoJSON(?)" : "?",
					value: (res) => {
						const val = res.attributes[attrName];
						return (attrSchema.type === "object" || attrSchema.type === "array") 
							? JSON.stringify(val) 
							: val;
					},
				}));

			const joins = Object.entries(resConfig.joins ?? {})
				.filter(([_, j]) => j.localColumn)
				.map(([joinAttr, j]) => ({
					column: j.localColumn,
					value: (res) =>
						applyOrMap(res.relationships[joinAttr], ({ id }) => id),
				}));
			const joinPlaceholders = joins.map(() => "?");

			const nonIdColumns = [...attributes, ...joins];

			const placeholders = replacePlaceholders(
				[
					"?",
					...attributes.map((a) => a.placeholder),
					...joinPlaceholders,
				].join(", "),
			);
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
			Object.entries(resConfig.joins ?? {})
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
			const joinTables = Object.values(resConfig.joins ?? {})
				.map((j) => j.joinTable)
				.filter(Boolean);

			return Promise.all(
				[table, ...joinTables].map((t) =>
					db.query(`DROP TABLE IF EXISTS ${t}`),
				),
			);
		}),
	);

	try {
		await db.query("DROP SCHEMA home CASCADE");
	} catch {
		// noop
	}

	await db.query("CREATE SCHEMA home");

	const createSQL = createTablesSQL(schema, config);
	await db.query(createSQL);

	await seed(db, schema, config, seedData);
}

/**
 * Truncates all tables and re-seeds data without dropping/recreating schema
 * This is faster and safer for test cleanup than full reset
 */
export async function reseed(db, schema, config, seedData) {
	// Get all table names
	const tables = Object.values(config.resources).flatMap((resConfig) => {
		const table = resConfig.table;
		const joinTables = Object.values(resConfig.joins ?? {})
			.map((j) => j.joinTable)
			.filter(Boolean);
		return [table, ...joinTables];
	});

	// Truncate all tables in a single command (faster and avoids FK issues)
	const uniqueTables = [...new Set(tables)];
	if (uniqueTables.length > 0) {
		await db.query(
			`TRUNCATE TABLE ${uniqueTables.join(", ")} RESTART IDENTITY CASCADE`,
		);
	}

	// Re-seed data
	await seed(db, schema, config, seedData);
}
