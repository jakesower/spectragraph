import { pickBy, snakeCase } from "lodash-es";

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
	const { joins, table } = resConfig;

	const resSchema = schema.resources[resource.type];
	const { idAttribute = "id" } = resSchema;

	const sql = `
    DELETE FROM ${table}
    WHERE ${snakeCase(idAttribute)} = $1
		RETURNING *
  `;

	await db.query(sql, [resource.id]);

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, val]) => {
			const { foreignColumn } = joins[relName];
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
	const m2mForeignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].joinTable,
	);

	await Promise.all(
		Object.entries(m2mForeignRelationships).map(async ([relName, val]) => {
			const { joinTable, localJoinColumn } = joins[relName];

			await Promise.all(
				val.map((v) =>
					db.query(
						`
							DELETE FROM ${joinTable}
              WHERE ${localJoinColumn} = $1
			`,
						[resource.id],
					),
				),
			);
		}),
	);

	return {
		type: resource.type,
		id: resource.id,
	};
}