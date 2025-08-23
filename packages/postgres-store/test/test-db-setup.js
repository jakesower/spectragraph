import { GenericContainer, Wait } from "testcontainers";
import pkg from "pg";
const { Client } = pkg;

/**
 * Global test database container and client
 */
let pgContainer = null;
let testDb = null;

/**
 * Starts a PostgreSQL testcontainer with PostGIS extension
 * @returns {Promise<{db: Client, container: GenericContainer}>}
 */
export async function startTestDb() {
	if (pgContainer && testDb) {
		return { db: testDb, container: pgContainer };
	}

	console.log("Starting PostgreSQL test container...");
	
	pgContainer = await new GenericContainer("postgis/postgis:15-3.3")
		.withEnvironment({
			POSTGRES_DB: "test_db",
			POSTGRES_USER: "test_user", 
			POSTGRES_PASSWORD: "test_password",
		})
		.withExposedPorts(5432)
		.withWaitStrategy(Wait.forLogMessage("database system is ready to accept connections", 2))
		.start();

	const host = pgContainer.getHost();
	const port = pgContainer.getMappedPort(5432);
	
	testDb = new Client({
		host,
		port,
		database: "test_db",
		user: "test_user",
		password: "test_password",
	});

	await testDb.connect();
	
	// Create required extensions
	await testDb.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	await testDb.query('CREATE EXTENSION IF NOT EXISTS "postgis"');

	// Store globally for access across modules
	globalThis.testDb = testDb;
	globalThis.pgContainer = pgContainer;

	console.log("PostgreSQL test container ready");
	
	return { db: testDb, container: pgContainer };
}

/**
 * Stops the test database and container
 */
export async function stopTestDb() {
	const db = globalThis.testDb || testDb;
	const container = globalThis.pgContainer || pgContainer;
	
	if (db) {
		await db.end();
		testDb = null;
		globalThis.testDb = null;
	}
	
	if (container) {
		await container.stop();
		pgContainer = null;
		globalThis.pgContainer = null;
	}
	
	console.log("PostgreSQL test container stopped");
}

/**
 * Gets the current test database client
 * @returns {Client|null}
 */
export function getTestDb() {
	return globalThis.testDb || testDb;
}