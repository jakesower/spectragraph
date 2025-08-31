import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";
import { transformValuesForStorage } from "@data-prism/sql-helpers";
import { columnTypeModifiers } from "./column-type-modifiers.js";
import { setInverseRelationships } from "./lib/store-helpers.js";

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
export async function update(resource, context) {
	const { config, schema, db } = context;

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

	const attributeValues = Object.values(resource.attributes ?? {});
	const relationshipValues = Object.values(localRelationships).map((r) => r.id);

	// Transform attribute values using column type modifiers
	const transformedAttributeValues = transformValuesForStorage(
		attributeValues,
		Object.keys(resource.attributes ?? {}),
		resSchema,
		columnTypeModifiers,
	);

	const vars = [...transformedAttributeValues, ...relationshipValues];

	const updated = {};
	let firstResult;
	if (columnsWithPlaceholders.length > 0) {
		const updateSql = `
			UPDATE ${table}
				SET ${columnsWithPlaceholders}
			WHERE ${snakeCase(idAttribute)} = ?
		`;

		const updateStmt = db.prepare(updateSql);
		updateStmt.run([...vars, resource.id]);

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
