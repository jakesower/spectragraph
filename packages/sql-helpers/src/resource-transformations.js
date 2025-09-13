import { camelCase, pick, pickBy, snakeCase } from "es-toolkit";

/**
 * Transforms attribute names from camelCase to snake_case for database columns
 * @param {Object} attributes - Resource attributes object
 * @returns {string[]} Array of snake_case column names
 */
export function getAttributeColumns(attributes) {
	return Object.keys(attributes ?? {}).map(snakeCase);
}

/**
 * Gets local relationship data filtered by join configuration
 * @param {Object} relationships - Resource relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Local relationships
 */
export function getLocalRelationships(relationships, joins) {
	return pickBy(relationships ?? {}, (_, k) => joins[k]?.localColumn);
}

/**
 * Gets relationship columns for local relationships
 * @param {Object} localRelationships - Local relationships
 * @param {Object} joinConfig - Join configuration for the resource
 * @returns {string[]} Array of relationship column names
 */
export function getRelationshipColumns(localRelationships, joinConfig) {
	return Object.keys(localRelationships).map(
		(r) => joinConfig.joins[r].localColumn,
	);
}

/**
 * Gets ID columns with proper snake_case transformation
 * @param {string} resourceId - Resource ID (optional)
 * @param {string} idAttribute - ID attribute name
 * @returns {string[]} Array of ID column names
 */
export function getIdColumns(resourceId, idAttribute) {
	return resourceId ? [snakeCase(idAttribute)] : [];
}

/**
 * Gets ID values array
 * @param {string} resourceId - Resource ID (optional)
 * @returns {string[]} Array of ID values
 */
export function getIdValues(resourceId) {
	return resourceId ? [resourceId] : [];
}

/**
 * Transforms database row keys from snake_case to camelCase
 * @param {Object} row - Database row object
 * @returns {Object} Transformed object with camelCase keys
 */
export function transformRowKeys(row) {
	const transformed = {};
	Object.entries(row).forEach(([k, v]) => {
		transformed[camelCase(k)] = v;
	});
	return transformed;
}

/**
 * Builds a complete resource object from database data
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} attributes - Resource attributes (already camelCase)
 * @param {Object} relationships - Resource relationships
 * @param {import('spectragraph').ResourceSchema} resourceSchema - Resource schema
 * @returns {Object} Complete resource object
 */
export function buildResourceObject(
	resourceType,
	resourceId,
	attributes,
	relationships,
	resourceSchema,
) {
	return {
		type: resourceType,
		id: resourceId,
		attributes: pick(attributes, Object.keys(resourceSchema.attributes)),
		relationships: relationships ?? {},
	};
}

/**
 * Prepares values for database insertion/update
 * @param {Object} resource - Resource object
 * @param {Object} localRelationships - Local relationships
 * @param {string[]} idValues - ID values array
 * @returns {Object} Prepared values object
 */
export function prepareValuesForStorage(
	resource,
	localRelationships,
	idValues,
) {
	const attributeValues = Object.values(resource.attributes ?? {});
	const relationshipValues = Object.values(localRelationships).map(
		(r) => r?.id ?? null,
	);

	return {
		attributeValues,
		relationshipValues,
		idValues,
		allValues: [...attributeValues, ...relationshipValues, ...idValues],
	};
}

/**
 * Creates column arrays for SQL operations
 * @param {Object} resource - Resource object
 * @param {Object} localRelationships - Local relationships
 * @param {string} idAttribute - ID attribute name
 * @param {Object} joinConfig - Join configuration
 * @param {boolean} includeId - Whether to include ID columns
 * @returns {Object} Column configuration object
 */
export function createColumnConfiguration(
	resource,
	localRelationships,
	idAttribute,
	joinConfig,
	includeId = true,
) {
	const attributeColumns = getAttributeColumns(resource.attributes);
	const relationshipColumns = getRelationshipColumns(
		localRelationships,
		joinConfig,
	);
	const idColumns = includeId ? [snakeCase(idAttribute)] : [];

	return {
		attributeColumns,
		relationshipColumns,
		idColumns,
		allColumns: [...attributeColumns, ...relationshipColumns, ...idColumns],
	};
}

/**
 * Creates SQL placeholders string
 * @param {number} count - Number of placeholders needed
 * @param {string} placeholder - Placeholder character (default: "?")
 * @returns {string} Comma-separated placeholders
 */
export function createPlaceholders(count, placeholder = "?") {
	return Array(count).fill(placeholder).join(", ");
}

/**
 * Creates SQL SET clause for UPDATE operations
 * @param {string[]} columns - Column names
 * @param {string} placeholder - Placeholder character (default: "?")
 * @returns {string} SET clause string
 */
export function createUpdateSetClause(columns, placeholder = "?") {
	return columns.map((col) => `${col} = ${placeholder}`).join(", ");
}

/**
 * Creates SQL conflict clause for UPSERT operations
 * @param {string[]} updateColumns - Columns to update on conflict
 * @returns {string} Conflict clause string
 */
export function createUpsertConflictClause(updateColumns) {
	return updateColumns.length === 0
		? "DO NOTHING"
		: `DO UPDATE SET ${updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(", ")}`;
}
