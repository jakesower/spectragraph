/**
 * @typedef {import('../sqlite-store.js').Resource} Resource
 * @typedef {import('../sqlite-store.js').Context} Context
 * @typedef {import('../sqlite-store.js').Config} Config
 */

/**
 * Updates many-to-many relationship inverses via join table
 */
async function replaceManyToManyInverses(resourceId, relValue, joinConfig, db) {
	const { joinTable, localJoinColumn, foreignJoinColumn } = joinConfig;

	// Remove existing entries for this resource in the join table
	const deleteStmt = db.prepare(
		`DELETE FROM ${joinTable} WHERE ${localJoinColumn} = ?`,
	);
	deleteStmt.run(resourceId);

	if (!relValue) return;

	const relatedIds = Array.isArray(relValue)
		? relValue.map((ref) => ref.id)
		: [relValue.id];

	// Insert new entries
	const insertStmt = db.prepare(
		`INSERT INTO ${joinTable} (${localJoinColumn}, ${foreignJoinColumn}) VALUES (?, ?)`,
	);

	// Use forEach for side effects (database operations)
	relatedIds.forEach((relatedId) => insertStmt.run(resourceId, relatedId));
}

/**
 * Updates one-to-many relationship inverses by setting foreign key in related table
 */
async function replaceOneToManyInverses(
	resourceId,
	relValue,
	joinConfig,
	relatedTable,
	db,
) {
	const { foreignColumn } = joinConfig;

	// Clear the foreign key for any resources that were previously related
	const clearStmt = db.prepare(
		`UPDATE ${relatedTable} SET ${foreignColumn} = NULL WHERE ${foreignColumn} = ?`,
	);
	clearStmt.run(resourceId);

	// Set the foreign key for the new related resources
	if (relValue) {
		const relatedIds = Array.isArray(relValue)
			? relValue.map((ref) => ref.id)
			: [relValue.id];

		const replaceStmt = db.prepare(
			`UPDATE ${relatedTable} SET ${foreignColumn} = ? WHERE id = ?`,
		);

		// Use forEach for side effects (database operations)
		relatedIds.forEach((relatedId) => replaceStmt.run(resourceId, relatedId));
	}
}

/**
 * Processes a single relationship field
 */
async function processRelationship(resource, relName, context) {
	const { id, type } = resource;
	const { db, schema, config, resourceConfig } = context;

	const relValue = resource.relationships[relName];
	const { type: relatedType, inverse } =
		schema.resources[type].relationships[relName];

	const relatedResourceConfig = config.resources[relatedType];
	const joinConfig = resourceConfig.joins?.[relName];

	if (!inverse) return;

	// Handle different relationship patterns
	if (joinConfig.joinTable) {
		// Many-to-many: replace join table
		return replaceManyToManyInverses(id, relValue, joinConfig, db);
	} else if (joinConfig.foreignColumn) {
		// One-to-many: replace foreign key in related table
		return replaceOneToManyInverses(
			id,
			relValue,
			joinConfig,
			relatedResourceConfig.table,
			db,
		);
	}
}

/**
 * Updates inverse relationships in the SQLite database to maintain bidirectional consistency.
 * After a resource is created or replaced, this ensures that all related resources have
 * their inverse relationship fields properly set.
 *
 * @param {Resource} resource - The resource whose relationships need inverse replaces
 * @param {Context} context - Store context with database and schema
 * @returns {Promise<void>}
 */
export async function setInverseRelationships(resource, context) {
	const { db, schema, config } = context;
	const { type, relationships = {} } = resource;

	if (!relationships || Object.keys(relationships).length === 0) {
		return;
	}

	const resourceConfig = config.resources[type];

	// Process each relationship field
	await Promise.all(
		Object.entries(relationships)
			.filter(([, relValue]) => relValue)
			.map(([relName]) =>
				processRelationship(resource, relName, {
					db,
					schema,
					config,
					resourceConfig,
				}),
			),
	);
}
