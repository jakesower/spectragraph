/**
 * @typedef {import('../postgres-store.js').Resource} Resource
 * @typedef {import('../postgres-store.js').Context} Context
 * @typedef {import('../postgres-store.js').Config} Config
 */

/**
 * Wraps a function with transaction handling (BEGIN/COMMIT/ROLLBACK)
 * @param {import('pg').Pool | import('pg').Client} db - PostgreSQL pool or client instance
 * @param {Function} fn - Function to execute within transaction
 * @returns {Promise<any>} Result of the function call
 */
export async function withTransaction(db, fn) {
	// Handle both Pool (has connect method) and Client (direct instance) cases
	let client;
	let shouldRelease = false;

	if (typeof db.connect === "function" && !db.query) {
		// This is a Pool instance
		client = await db.connect();
		shouldRelease = true;
	} else {
		// This is a Client instance
		client = db;
		shouldRelease = false;
	}

	try {
		await client.query("BEGIN");
		const result = await fn(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		if (shouldRelease) {
			client.release();
		}
	}
}

/**
 * Updates many-to-many relationship inverses via join table
 */
async function replaceManyToManyInverses(
	resourceId,
	relValue,
	joinConfig,
	client,
) {
	const { joinTable, localJoinColumn, foreignJoinColumn } = joinConfig;

	if (!relValue) return;

	const relatedIds = Array.isArray(relValue)
		? relValue.map((ref) => ref.id)
		: [relValue.id];

	// Remove existing entries for this resource in the join table
	await client.query(`DELETE FROM ${joinTable} WHERE ${localJoinColumn} = $1`, [
		resourceId,
	]);

	// Insert new entries
	if (relatedIds.length > 0) {
		const values = relatedIds.map((_, i) => `($1, $${i + 2})`).join(", ");
		await client.query(
			`INSERT INTO ${joinTable} (${localJoinColumn}, ${foreignJoinColumn}) VALUES ${values}`,
			[resourceId, ...relatedIds],
		);
	}
}

/**
 * Updates one-to-many relationship inverses by setting foreign key in related table
 */
async function replaceOneToManyInverses(
	resourceId,
	relValue,
	joinConfig,
	relatedTable,
	client,
) {
	const { foreignColumn } = joinConfig;

	// Clear the foreign key for any resources that were previously related
	await client.query(
		`UPDATE ${relatedTable} SET ${foreignColumn} = NULL WHERE ${foreignColumn} = $1`,
		[resourceId],
	);

	// Set the foreign key for the new related resources
	if (relValue) {
		const relatedIds = Array.isArray(relValue)
			? relValue.map((ref) => ref.id)
			: [relValue.id];

		if (relatedIds.length > 0) {
			const placeholders = relatedIds.map((_, i) => `$${i + 2}`).join(", ");
			await client.query(
				`UPDATE ${relatedTable} SET ${foreignColumn} = $1 WHERE id IN (${placeholders})`,
				[resourceId, ...relatedIds],
			);
		}
	}
}

/**
 * Clears previous inverse relationships when a many-to-one relationship changes
 * Currently a no-op as inverse clearing is handled by the main relationship update
 */
async function clearPreviousInverses() {
	// This function is intentionally empty as inverse relationship clearing
	// is handled by the main relationship update process
}

/**
 * Processes a single relationship field
 */
async function processRelationship(resource, relName, context) {
	const { id, type } = resource;
	const { client, schema, config } = context;

	const resourceConfig = config.resources[type];

	const relValue = resource.relationships[relName];
	const { type: relatedType, inverse } =
		schema.resources[type].relationships[relName];

	const relatedResourceConfig = config.resources[relatedType];
	const joinConfig = resourceConfig.joins?.[relName];

	if (!inverse) return;

	// Handle different relationship patterns
	if (joinConfig.joinTable) {
		// Many-to-many: replace join table
		return replaceManyToManyInverses(id, relValue, joinConfig, client);
	} else if (joinConfig.foreignColumn) {
		// One-to-many: replace foreign key in related table
		return replaceOneToManyInverses(
			id,
			relValue,
			joinConfig,
			relatedResourceConfig.table,
			client,
		);
	} else if (joinConfig.localColumn) {
		// Many-to-one: clear previous inverses
		return clearPreviousInverses();
	}
}

/**
 * Updates inverse relationships in the PostgreSQL database to maintain bidirectional consistency.
 * After a resource is created or replaced, this ensures that all related resources have
 * their inverse relationship fields properly set.
 *
 * @param {Resource} resource - The resource whose relationships need inverse replaces
 * @param {Context & {client: import('pg').PoolClient}} context - Store context with database client
 * @returns {Promise<void>}
 */
export async function setInverseRelationships(resource, context) {
	const { client, schema, config } = context;
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
					client,
					schema,
					config,
					resourceConfig,
				}),
			),
	);
}
