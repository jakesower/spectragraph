import { pickBy, snakeCase } from "es-toolkit";

/**
 * @typedef {import('./postgres-store.js').DeleteResource} DeleteResource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Deletes a resource from the database
 * @param {DeleteResource} resource - The resource to delete
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<DeleteResource>} The deleted resource reference
 */
export async function deleteResource(resource, context) {
	const { config, schema } = context;

	const { db } = config;

	const resConfig = config.resources[resource.type];
	const { joins = {}, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const sql = `
    DELETE FROM ${table}
    WHERE ${snakeCase(idAttribute)} = $1
		RETURNING *
  `;

	await db.query(sql, [resource.id]);

	// handle to-one foreign columns
	const foreignRelationships = pickBy(joins, (jr) => jr.foreignColumn);
	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, join]) => {
			const { foreignColumn } = join;
			const foreignTable =
				config.resources[resSchema.relationships[relName].type].table;

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = NULL
				WHERE ${foreignColumn} = $1
			`,
				[resource.id],
			);
		}),
	);

	// handle many-to-many columns
	const m2mForeignRelationships = pickBy(joins, (jr) => jr.joinTable);
	await Promise.all(
		Object.values(m2mForeignRelationships).map(async (join) => {
			const { joinTable, localJoinColumn } = join;

			await db.query(
				`
				DELETE FROM ${joinTable}
				WHERE ${localJoinColumn} = $1
				`,
				[resource.id],
			);
		}),
	);

	return {
		type: resource.type,
		id: resource.id,
	};
}
