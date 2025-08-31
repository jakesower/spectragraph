import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";
import { randomUUID } from "crypto";
import { transformValuesForStorage } from "@data-prism/sql-helpers";
import { columnTypeModifiers } from "./column-type-modifiers.js";
import { setInverseRelationships } from "./lib/store-helpers.js";

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
	const { config, schema, db } = context;

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

	const attributeValues = Object.values(resource.attributes);
	const relationshipValues = Object.values(localRelationships).map(
		(r) => r?.id ?? null,
	);
	const idValues = idVars;

	// Transform attribute values using column type modifiers
	const transformedAttributeValues = transformValuesForStorage(
		attributeValues,
		Object.keys(resource.attributes),
		resSchema,
		columnTypeModifiers,
	);

	const vars = [
		...transformedAttributeValues,
		...relationshipValues,
		...idValues,
	];

	const insertSql = `
    INSERT INTO ${table}
      (${columns.join(", ")})
    VALUES
      (${placeholders})
  `;

	const insertStmt = db.prepare(insertSql);
	insertStmt.run(vars);

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

	const createdResource = {
		type: resource.type,
		id: created[idAttribute],
		attributes: pick(created, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};

	// Set inverse relationships using the helper function
	await setInverseRelationships(createdResource, context);

	return createdResource;
}
