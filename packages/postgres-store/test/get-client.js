import pkg from "pg";
const { Client } = pkg;

/**
 * Gets the test database client for use in tests
 * @returns {import('pg').Client} The test database client
 */
export function getClient() {
	// First try to get from globalThis (when available)
	const db = globalThis.testDb;
	if (db) {
		return db;
	}
	
	// If not available, create a new connection using environment variables
	if (process.env.TEST_DB_HOST && process.env.TEST_DB_PORT) {
		console.log("Creating new test DB connection using environment variables");
		const client = new Client({
			host: process.env.TEST_DB_HOST,
			port: parseInt(process.env.TEST_DB_PORT),
			database: process.env.TEST_DB_DATABASE,
			user: process.env.TEST_DB_USER,
			password: process.env.TEST_DB_PASSWORD,
		});
		
		// Store in globalThis for reuse
		globalThis.testDb = client;
		
		// Connect asynchronously but don't wait
		client.connect().catch(err => {
			console.error("Failed to connect to test database:", err);
		});
		
		return client;
	}
	
	throw new Error("Test database not initialized. Make sure globalSetup is running.");
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use getClient() instead
 */
export const db = getClient;