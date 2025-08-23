import { startTestDb, stopTestDb } from "./test-db-setup.js";
import { reset } from "../scripts/seed.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";

/**
 * Global setup - starts PostgreSQL container and seeds data
 */
export default async function setup() {
	console.log("GLOBAL SETUP IS RUNNING!");
	const { db, container } = await startTestDb();
	console.log("Database container ready, seeding data...");
	console.log("globalThis.testDb is:", globalThis.testDb ? "SET" : "NOT SET");
	await reset(db, careBearSchema, careBearConfig, careBearData);
	console.log("Global test setup complete");
	console.log("Final globalThis.testDb is:", globalThis.testDb ? "SET" : "NOT SET");
	
	// Store connection details in environment variables for tests to use
	process.env.TEST_DB_HOST = container.getHost();
	process.env.TEST_DB_PORT = container.getMappedPort(5432).toString();
	process.env.TEST_DB_DATABASE = "test_db";
	process.env.TEST_DB_USER = "test_user";
	process.env.TEST_DB_PASSWORD = "test_password";
	
	console.log("Database connection info stored in environment variables");
}

/**
 * Global teardown - stops PostgreSQL container
 */
export async function teardown() {
	console.log("Starting global test teardown...");
	await stopTestDb();
	console.log("Global test teardown complete");
}