import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";
import { setInverseRelationships } from "./lib/store-helpers.js";

/**
 * @typedef {import('./postgres-store.js').UpdateResource} UpdateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Updates an existing resource in the database
 * @param {UpdateResource} resource - The resource to update
 * @param {Context & {client: import('pg').PoolClient}} context - Database context with config, schema, and client
 * @returns {Promise<Resource>} The updated resource
 */
export async function update(resource, context) {
	const { config, schema, client } = context;

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

		const { rows } = await client.query(sql, [...vars, resource.id]);
		firstResult = rows[0];
	} else {
		const { rows } = await client.query(
			`SELECT * FROM ${table} WHERE ${snakeCase(idAttribute)} = $1`,
			[resource.id],
		);
		firstResult = rows[0];
	}

	Object.entries(firstResult).forEach(([k, v]) => {
		updated[camelCase(k)] = v;
	});

	const updatedResource = {
		type: resource.type,
		id: updated[idAttribute],
		attributes: pick(updated, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};

	// Set inverse relationships using the helper function
	await setInverseRelationships(updatedResource, context);

	return updatedResource;
}
