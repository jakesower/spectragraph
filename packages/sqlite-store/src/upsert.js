import { camelCase, pick, pickBy, snakeCase } from "lodash-es";
import { randomUUID } from "crypto";

/**
 * @typedef {import('./sqlite-store.js').CreateResource} CreateResource
 * @typedef {import('./sqlite-store.js').UpdateResource} UpdateResource
 * @typedef {import('./sqlite-store.js').Resource} Resource
 * @typedef {import('./sqlite-store.js').Context} Context
 */

/**
 * Upserts a resource row (INSERT ... ON CONFLICT ... DO UPDATE)
 * @param {CreateResource|UpdateResource} resource - The resource to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Resource} The upserted resource
 */
export function upsertResourceRow(resource, context) {
	const { config, schema } = context;
	const { db } = config;

	const resSchema = schema.resources[resource.type];
	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const { idAttribute = "id" } = resSchema;

	const attributeColumns = Object.keys(resource.attributes ?? {}).map(
		snakeCase,
	);

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
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	// Convert boolean values to integers for SQLite
	const sqliteVars = vars.map((v) =>
		typeof v === "boolean" ? (v ? 1 : 0) : v,
	);

	const updateColumns = [...attributeColumns, ...relationshipColumns]
		.map((col) => `${col} = EXCLUDED.${col}`)
		.join(", ");

	const conflictClause =
		updateColumns.length === 0
			? "DO NOTHING"
			: `DO UPDATE SET ${updateColumns}`;

	const upsertSql = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
		ON CONFLICT(${snakeCase(idAttribute)})
			${conflictClause}
  `;

	const upsertStmt = db.prepare(upsertSql);
	upsertStmt.run(sqliteVars);

	// Get the upserted resource
	const selectSql = `SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = ?`;
	const selectStmt = db.prepare(selectSql);
	const upsertedRow = selectStmt.get(resourceId);

	const upserted = {};
	Object.entries(upsertedRow).forEach(([k, v]) => {
		upserted[camelCase(k)] = v;
	});

	return {
		type: resource.type,
		id: upserted[idAttribute],
		attributes: pick(upserted, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * Upserts foreign relationship rows for a resource
 * @param {Resource} resource - The resource with relationships to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Resource} The resource with upserted relationships
 */
export function upsertForeignRelationshipRows(resource, context) {
	const { config, schema } = context;
	const { db } = config;

	const resSchema = schema.resources[resource.type];
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

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
		clearStmt.run(resource.id);

		// Set new foreign key references
		const updateSql = `
			UPDATE ${foreignTable}
			SET ${foreignColumn} = ?
			WHERE ${snakeCase(foreignIdAttribute)} = ?
		`;
		const updateStmt = db.prepare(updateSql);

		val.forEach((v) => {
			updateStmt.run(resource.id, v.id);
		});
	});

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	Object.entries(m2mForeignRelationships).forEach(([relName, val]) => {
		const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

		// Clear existing relationships
		const deleteSql = `DELETE FROM ${joinTable} WHERE ${localJoinColumn} = ?`;
		const deleteStmt = db.prepare(deleteSql);
		deleteStmt.run(resource.id);

		// Insert new relationships
		const insertSql = `
			INSERT OR IGNORE INTO ${joinTable}
			(${localJoinColumn}, ${foreignJoinColumn})
			VALUES (?, ?)
		`;
		const insertStmt = db.prepare(insertSql);

		val.forEach((v) => {
			insertStmt.run(resource.id, v.id);
		});
	});

	return {
		type: resource.type,
		id: resource.id,
		attributes: pick(resource, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}

/**
 * Upserts a resource (INSERT or UPDATE) including relationships
 * @param {CreateResource|UpdateResource} resource - The resource to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Resource} The upserted resource
 */
export function upsert(resource, context) {
	const upserted = upsertResourceRow(resource, context);
	return upsertForeignRelationshipRows(upserted, context);
}
