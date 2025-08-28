import { pickBy, snakeCase } from "es-toolkit";

/**
 * @typedef {import('./sqlite-store.js').DeleteResource} DeleteResource
 * @typedef {import('./sqlite-store.js').Context} Context
 */

/**
 * Deletes a resource from the database
 * @param {DeleteResource} resource - The resource to delete
 * @param {Context} context - Database context with config and schema
 * @returns {DeleteResource} The deleted resource reference
 */
export function deleteResource(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins = {}, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const deleteSql = `
    DELETE FROM ${table}
    WHERE ${snakeCase(idAttribute)} = ?
  `;

	const deleteStmt = db.prepare(deleteSql);
	deleteStmt.run(resource.id);

	// handle to-one foreign columns
	const foreignRelationships = pickBy(joins, (jr) => jr.foreignColumn);
	Object.entries(foreignRelationships).forEach(([relName, join]) => {
		const { foreignColumn } = join;
		const foreignTable =
			config.resources[resSchema.relationships[relName].type].table;

		const updateSql = `
			UPDATE ${foreignTable}
			SET ${foreignColumn} = NULL
			WHERE ${foreignColumn} = ?
		`;
		const updateStmt = db.prepare(updateSql);
		updateStmt.run(resource.id);
	});

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(joins, (jr) => jr.joinTable);
	Object.values(m2mForeignRelationships).forEach((join) => {
		const { joinTable, localJoinColumn } = join;

		const deleteSql = `
			DELETE FROM ${joinTable}
			WHERE ${localJoinColumn} = ?
		`;
		const deleteStmt = db.prepare(deleteSql);
		deleteStmt.run(resource.id);
	});

	return {
		type: resource.type,
		id: resource.id,
	};
}
