import { camelCase, pick, pickBy, snakeCase } from "lodash-es";

/**
 * @typedef {import('./sqlite-store.js').UpdateResource} UpdateResource
 * @typedef {import('./sqlite-store.js').Resource} Resource
 * @typedef {import('./sqlite-store.js').Context} Context
 */

/**
 * Updates an existing resource in the database
 * @param {UpdateResource} resource - The resource to update
 * @param {Context} context - Database context with config and schema
 * @returns {Resource} The updated resource
 */
export function update(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins, table } = resConfig;

	const resSchema = schema.resources[resource.type];
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

	const columns = [...attributeColumns, ...relationshipColumns];
	const columnsWithPlaceholders = columns.map((col) => `${col} = ?`).join(", ");

	const vars = [
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r.id),
	];

	// Convert boolean values to integers for SQLite
	const sqliteVars = vars.map((v) =>
		typeof v === "boolean" ? (v ? 1 : 0) : v,
	);

	const updated = {};
	let firstResult;
	if (columnsWithPlaceholders.length > 0) {
		const updateSql = `
			UPDATE ${table}
				SET ${columnsWithPlaceholders}
			WHERE ${snakeCase(idAttribute)} = ?
		`;

		const updateStmt = db.prepare(updateSql);
		updateStmt.run([...sqliteVars, resource.id]);

		// Get the updated resource
		const selectSql = `SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = ?`;
		const selectStmt = db.prepare(selectSql);
		firstResult = selectStmt.get(resource.id);
	} else {
		// No attributes or relationships to update, just get the existing resource
		const selectSql = `SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = ?`;
		const selectStmt = db.prepare(selectSql);
		firstResult = selectStmt.get(resource.id);
	}

	Object.entries(firstResult).forEach(([k, v]) => {
		updated[camelCase(k)] = v;
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
		clearStmt.run(updated[idAttribute]);

		// Set new foreign key references
		const updateSql = `
			UPDATE ${foreignTable}
			SET ${foreignColumn} = ?
			WHERE ${snakeCase(foreignIdAttribute)} = ?
		`;
		const updateStmt = db.prepare(updateSql);

		val.forEach((v) => {
			updateStmt.run(updated[idAttribute], v.id);
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
		deleteStmt.run(updated[idAttribute]);

		// Insert new relationships
		const insertSql = `
			INSERT OR IGNORE INTO ${joinTable}
			(${localJoinColumn}, ${foreignJoinColumn})
			VALUES (?, ?)
		`;
		const insertStmt = db.prepare(insertSql);

		val.forEach((v) => {
			insertStmt.run(updated[idAttribute], v.id);
		});
	});

	return {
		type: resource.type,
		id: updated[idAttribute],
		attributes: pick(updated, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}
