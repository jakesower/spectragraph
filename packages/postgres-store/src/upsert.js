import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";
import { replacePlaceholders } from "./helpers/query-helpers.js";

/**
 * @typedef {import('./postgres-store.js').CreateResource} CreateResource
 * @typedef {import('./postgres-store.js').UpdateResource} UpdateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Upserts a resource row (INSERT ... ON CONFLICT ... DO UPDATE)
 * @param {CreateResource|UpdateResource} resource - The resource to upsert
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The upserted resource
 */
async function upsertResourceRow(resource, context) {
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

	const idColumns = resource.id ? [snakeCase(idAttribute)] : [];
	const idVars = resource.id ? [resource.id] : [];

	const columns = [...attributeColumns, ...relationshipColumns, ...idColumns];
	const placeholders = replacePlaceholders(columns.map(() => "?").join(", "));
	const vars = [
		...Object.values(resource.attributes ?? {}),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	const updateColumns = [...attributeColumns, ...relationshipColumns]
		.map((col) => `${col} = EXCLUDED.${col}`)
		.join(", ");

	const conflictClause =
		updateColumns.length === 0
			? "DO NOTHING"
			: `DO UPDATE SET ${updateColumns}`;

	const sql = `
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
		ON CONFLICT(${snakeCase(idAttribute)})
			${conflictClause}
		RETURNING *
  `;

	const { rows } = await db.query(sql, vars);
	const upserted = { [idAttribute]: resource.id };
	Object.entries(rows[0] ?? {}).forEach(([k, v]) => {
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
 * @returns {Promise<Resource>} The resource with upserted relationships
 */
async function upsertForeignRelationshipRows(resource, context) {
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
				[resource.id, val.map((v) => v.id)],
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
				val.map(async (v) => {
					await db.query(
						`
								DELETE FROM ${joinTable}
								WHERE ${localJoinColumn} = $1
							`,
						[resource.id],
					);
					await db.query(
						`
								INSERT INTO ${joinTable}
								(${localJoinColumn}, ${foreignJoinColumn})
								VALUES ($1, $2)
								ON CONFLICT DO NOTHING
							`,
						[resource.id, v.id],
					);
				}),
			);
		}),
	);

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
 * @returns {Promise<Resource>} The upserted resource
 */
export async function upsert(resource, context) {
	const upserted = await upsertResourceRow(resource, context);
	return upsertForeignRelationshipRows(upserted, context);
}
