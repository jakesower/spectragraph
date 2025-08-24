import { camelCase, pick, pickBy, snakeCase } from "lodash-es";

/**
 * @typedef {import('./postgres-store.js').UpdateResource} UpdateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Updates an existing resource in the database
 * @param {UpdateResource} resource - The resource to update
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The updated resource
 */
export async function update(resource, context) {
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
	const columnsWithPlaceholders = columns
		.map((col, idx) => `${col} = $${idx + 1}`)
		.join(", ");

	const vars = [
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r.id),
	];

	const updated = {};
	let firstResult;
	if (columnsWithPlaceholders.length > 0) {
		const sql = `
			UPDATE ${table}
				SET ${columnsWithPlaceholders}
			WHERE ${snakeCase(idAttribute)} = $${columns.length + 1}
			RETURNING *
		`;

		const { rows } = await db.query(sql, [...vars, resource.id]);
		firstResult = rows[0];
	} else {
		const { rows } = await db.query(
			`SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
			[resource.id],
		);
		firstResult = rows[0];
	}

	Object.entries(firstResult).forEach(([k, v]) => {
		updated[camelCase(k)] = v;
	});

	// handle to-one foreign columns
	const foreignRelationships = pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k].foreignColumn,
	);

	await Promise.all(
		Object.entries(foreignRelationships).map(async ([relName, val]) => {
			const { foreignColumn } = joins[relName];
			const foreignIdAttribute =
				schema.resources[resSchema.relationships[relName].type].idAttribute ??
				"id";
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

			await db.query(
				`
				UPDATE ${foreignTable}
				SET ${foreignColumn} = $1
				WHERE ${foreignIdAttribute} = ANY ($2)
			`,
				[updated[idAttribute], val.map((v) => v.id)],
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
			const { joinTable, localJoinColumn, foreignJoinColumn } = joins[relName];

			await Promise.all(
				val.map((v) =>
					db.query(
						`
							INSERT INTO ${joinTable}
							(${localJoinColumn}, ${foreignJoinColumn})
							VALUES ($1, $2)
			`,
						[updated[idAttribute], v.id],
					),
				),
			);
		}),
	);

	return {
		type: resource.type,
		id: updated[idAttribute],
		attributes: pick(updated, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}
