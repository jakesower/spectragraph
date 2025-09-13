import { pickBy, snakeCase } from "es-toolkit";

/**
 * @typedef {Object} RelationshipContext
 * @property {import('spectragraph').Schema} schema - The schema
 * @property {Object} config - Store configuration
 * @property {string} resourceType - The resource type
 * @property {string} resourceId - The resource ID
 */

/**
 * @typedef {Object} DatabaseOperations
 * @property {Function} clearForeignKey - Clear foreign key operation: (table, column, id) => void|Promise<void>
 * @property {Function} updateForeignKey - Update foreign key operation: (table, column, resourceId, idAttr, targetId) => void|Promise<void>
 * @property {Function} insertManyToMany - Insert many-to-many relationship: (table, localCol, foreignCol, localId, foreignId) => void|Promise<void>
 * @property {Function} deleteManyToMany - Delete many-to-many relationships: (table, column, id) => void|Promise<void>
 */

/**
 * Gets foreign (to-one) relationships from a resource
 * @param {Object} resource - The resource with relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Foreign relationships
 */
export function getForeignRelationships(resource, joins) {
	return pickBy(
		resource.relationships ?? {},
		(_, k) => joins[k]?.foreignColumn,
	);
}

/**
 * Gets many-to-many relationships from a resource
 * @param {Object} resource - The resource with relationships
 * @param {Object} joins - Join configuration
 * @returns {Object} Many-to-many relationships
 */
export function getManyToManyRelationships(resource, joins) {
	return pickBy(resource.relationships ?? {}, (_, k) => joins[k]?.joinTable);
}

/**
 * Gets metadata for a foreign relationship
 * @param {string} relName - Relationship name
 * @param {string} resourceType - Current resource type
 * @param {RelationshipContext} context - Relationship context
 * @returns {Object} Relationship metadata
 */
export function getForeignRelationshipMeta(relName, resourceType, context) {
	const { schema, config } = context;
	const resSchema = schema.resources[resourceType];
	const resConfig = config.resources[resourceType];

	const { foreignColumn } = resConfig.joins[relName];
	const foreignResourceType = resSchema.relationships[relName].type;
	const foreignIdAttribute =
		schema.resources[foreignResourceType].idAttribute ?? "id";
	const foreignTable = config.resources[foreignResourceType].table;

	return {
		foreignColumn,
		foreignIdAttribute,
		foreignTable,
		foreignResourceType,
	};
}

/**
 * Gets metadata for a many-to-many relationship
 * @param {string} relName - Relationship name
 * @param {string} resourceType - Current resource type
 * @param {RelationshipContext} context - Relationship context
 * @returns {Object} Relationship metadata
 */
export function getManyToManyRelationshipMeta(relName, resourceType, context) {
	const { config } = context;
	const resConfig = config.resources[resourceType];

	const { joinTable, localJoinColumn, foreignJoinColumn } =
		resConfig.joins[relName];

	return {
		joinTable,
		localJoinColumn,
		foreignJoinColumn,
	};
}

/**
 * Processes foreign (to-one) relationships
 * @param {Object} resource - The resource with relationships
 * @param {RelationshipContext} context - Relationship context
 * @param {DatabaseOperations} dbOps - Database operations
 * @returns {Promise<void>|void}
 */
export function processForeignRelationships(resource, context, dbOps) {
	const { config } = context;
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

	const foreignRelationships = getForeignRelationships(resource, joins);

	const operations = Object.entries(foreignRelationships)
		.map(([relName, val]) => {
			const meta = getForeignRelationshipMeta(relName, resource.type, context);

			// Clear existing foreign key references
			const clearOp = dbOps.clearForeignKey(
				meta.foreignTable,
				meta.foreignColumn,
				context.resourceId,
			);

			// Set new foreign key references
			const updateOps = val.map((v) =>
				dbOps.updateForeignKey(
					meta.foreignTable,
					meta.foreignColumn,
					context.resourceId,
					snakeCase(meta.foreignIdAttribute),
					v.id,
				),
			);

			return [clearOp, ...updateOps];
		})
		.flat();

	// Handle both sync and async operations
	if (operations.some((op) => op && typeof op.then === "function")) {
		return Promise.all(operations.filter((op) => op));
	}
}

/**
 * Processes many-to-many relationships
 * @param {Object} resource - The resource with relationships
 * @param {RelationshipContext} context - Relationship context
 * @param {DatabaseOperations} dbOps - Database operations
 * @returns {Promise<void>|void}
 */
export function processManyToManyRelationships(resource, context, dbOps) {
	const { config, resourceId } = context;
	const resConfig = config.resources[resource.type];
	const { joins } = resConfig;

	const m2mRelationships = getManyToManyRelationships(resource, joins);

	const operations = Object.entries(m2mRelationships)
		.map(([relName, val]) => {
			const meta = getManyToManyRelationshipMeta(
				relName,
				resource.type,
				context,
			);

			const ops = [];

			// Clear existing relationships (for update operations)
			if (context.clearExisting) {
				ops.push(
					dbOps.deleteManyToMany(
						meta.joinTable,
						meta.localJoinColumn,
						resourceId,
					),
				);
			}

			// Insert new relationships
			val.forEach((v) => {
				ops.push(
					dbOps.insertManyToMany(
						meta.joinTable,
						meta.localJoinColumn,
						meta.foreignJoinColumn,
						resourceId,
						v.id,
					),
				);
			});

			return ops;
		})
		.flat();

	// Handle both sync and async operations
	if (operations.some((op) => op && typeof op.then === "function")) {
		return Promise.all(operations.filter((op) => op));
	}
}
