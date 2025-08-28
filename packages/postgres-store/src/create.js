import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";
import { replacePlaceholders } from "./helpers/query-helpers.js";
import {
	processForeignRelationships,
	processManyToManyRelationships,
} from "@data-prism/sql-helpers";
import { createPostgreSQLOperations } from "./database-operations.js";

/**
 * @typedef {import('./postgres-store.js').CreateResource} CreateResource
 * @typedef {import('./postgres-store.js').Resource} Resource
 * @typedef {import('./postgres-store.js').Context} Context
 */

/**
 * Creates a new resource in the database
 * @param {CreateResource} resource - The resource to create
 * @param {Context} context - Database context with config and schema
 * @returns {Promise<Resource>} The created resource
 */
export async function create(resource, context) {
	const { config, schema } = context;

	const { db } = config;

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

	const idColumns = resource.id ? [snakeCase(idAttribute)] : [];
	const idVars = resource.id ? [resource.id] : [];

	const columns = [...attributeColumns, ...relationshipColumns, ...idColumns];
	const placeholders = replacePlaceholders(columns.map(() => "?").join(", "));
	const vars = [
		...Object.values(resource.attributes),
		...Object.values(localRelationships).map((r) => r?.id ?? null),
		...idVars,
	];

	const sql = `
    INSERT INTO ${table}
      (${columns.join(", ")})
    VALUES
      (${placeholders})
		RETURNING *
  `;

	const { rows } = await db.query(sql, vars);
	const created = {};
	Object.entries(rows[0]).forEach(([k, v]) => {
		created[camelCase(k)] = v;
	});

	// Handle relationships using shared utilities
	const dbOps = createPostgreSQLOperations(db);
	const relationshipContext = {
		schema,
		config,
		resourceType: resource.type,
		resourceId: created[idAttribute],
		clearExisting: false,
	};

	await processForeignRelationships(resource, relationshipContext, dbOps);
	await processManyToManyRelationships(resource, relationshipContext, dbOps);

	return {
		type: resource.type,
		id: created[idAttribute],
		attributes: pick(created, Object.keys(resSchema.attributes)),
		relationships: resource.relationships ?? {},
	};
}
