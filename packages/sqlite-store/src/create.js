import { camelCase, pick, pickBy, snakeCase } from "lodash-es";
import { randomUUID } from "crypto";

/**
 * @typedef {import('./sqlite-store.js').CreateResource} CreateResource
 * @typedef {import('./sqlite-store.js').Resource} Resource
 * @typedef {import('./sqlite-store.js').Context} Context
 */

/**
 * Creates a new resource in the database
 * @param {CreateResource} resource - The resource to create
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The created resource
 */
export async function create(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const attributeColumns = Object.keys(resource.attributes).map(snakeCase);

	const localRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].localColumn,
	);

	const relationshipColumns = Object.keys(localRelationships).map(
		(r) => resConfig.joins[r].localColumn,
	);

	// Generate UUID if no ID provided
	const resourceId = resource.id || randomUUID();
	const idColumns = [snakeCase(idAttribute)];
	const idVars = [resourceId];

	const columns = [...attributeColumns, ...relationshipColumns, ...idColumns];
	const placeholders = columns.map(() => "?").join(", ");
	const vars = [
		...Object.values(resource.attributes),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	const insertSql = `
    INSERT INTO ${table}
      (${columns.join(", ")})
    VALUES
      (${placeholders})
  `;

	// Convert boolean values to integers for SQLite
	const sqliteVars = vars.map((v) =>
		typeof v === "boolean" ? (v ? 1 : 0) : v,
	);

	const insertStmt = db.prepare(insertSql);
	insertStmt.run(sqliteVars);

	// Get the created resource using the UUID we inserted
	const selectSql = `SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = ?`;
	const selectStmt = db.prepare(selectSql);
	const createdRow = selectStmt.get(resourceId);

	if (!createdRow) {
		throw new Error(
			`Failed to retrieve created resource with id ${resourceId} from table ${table}`,
		);
	}

	const created = {};
	Object.entries(createdRow).forEach(([k, v]) => {
		created[camelCase(k)] = v;
	});

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	Object.entries(foreignRelationships).forEach(([relName, val]) => {
		const { foreignColumn } = joins[relName];
		const foreignIdAttribute =
			schema.resources[resSchema.relationships[relName].type].idAttribute ??
			"id";
		const foreignTable =
			config.resources[resSchema.relationships[relName].type].table;

		// Clear existing foreign key references
		const clearSql = `
			UPDATE ${foreignTable}
			SET ${foreignColumn} = NULL
			WHERE ${foreignColumn} = ?
		`;
		const clearStmt = db.prepare(clearSql);
		clearStmt.run(created[idAttribute]);

		// Set new foreign key references
		const updateSql = `
			UPDATE ${foreignTable}
			SET ${foreignColumn} = ?
			WHERE ${snakeCase(foreignIdAttribute)} = ?
		`;
		const updateStmt = db.prepare(updateSql);

		val.forEach((v) => {
			updateStmt.run(created[idAttribute], v.id);
		});
	});

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	Object.entries(m2mForeignRelationships).forEach(([relName, val]) => {
		const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

		const insertSql = `
			INSERT OR IGNORE INTO ${joinTable}
			(${localJoinColumn}, ${foreignJoinColumn})
			VALUES (?, ?)
		`;
		const insertStmt = db.prepare(insertSql);

		val.forEach((v) => {
			insertStmt.run(created[idAttribute], v.id);
		});
	});

	return {
		type: resource.type,
		id: created[idAttribute],
		attributes: pick(created, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}
