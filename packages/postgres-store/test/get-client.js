/**
 * Gets the test database client for use in tests
 * @returns {import('pg').Client} The test database client
 */
export function getClient() {
	const db = globalThis.testDb;
	if (!db) {
		throw new Error("Test database not initialized. Make sure globalSetup is running.");
	}
	return db;
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use getClient() instead
 */
export const db = getClient;