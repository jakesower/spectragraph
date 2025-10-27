import pkg from "pg";
const { Client } = pkg;

// Module-level cache for the client
let cachedClient = null;

/**
 * Initializes the database client connection
 * @returns {Promise<import('pg').Client>}
 */
export async function initializeClient() {
	if (cachedClient) {
		return cachedClient;
	}

	// Try to get from globalThis first (set by global setup)
	if (globalThis.testDb) {
		cachedClient = globalThis.testDb;
		return cachedClient;
	}

	// Otherwise, create a new connection using environment variables
	if (!process.env.TEST_DB_HOST || !process.env.TEST_DB_PORT) {
		throw new Error(
			"Test database not initialized. Make sure globalSetup is running and environment variables are set.",
		);
	}

	console.log("Creating new test DB connection using environment variables");
	const client = new Client({
		host: process.env.TEST_DB_HOST,
		port: parseInt(process.env.TEST_DB_PORT),
		database: process.env.TEST_DB_DATABASE,
		user: process.env.TEST_DB_USER,
		password: process.env.TEST_DB_PASSWORD,
	});

	await client.connect();
	cachedClient = client;
	globalThis.testDb = client;

	return client;
}

/**
 * Gets the test database client for use in tests (synchronous).
 * Must be called after initializeClient() has been called at least once.
 * @returns {import('pg').Client} The test database client
 */
export function getClient() {
	if (cachedClient) {
		return cachedClient;
	}

	// Try globalThis as fallback
	if (globalThis.testDb) {
		cachedClient = globalThis.testDb;
		return cachedClient;
	}

	throw new Error(
		"Test database client not initialized. Call initializeClient() in a beforeAll hook first.",
	);
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use getClient() instead
 */
export const db = getClient;
