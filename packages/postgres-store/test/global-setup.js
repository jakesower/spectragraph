import { startTestDb, stopTestDb } from "./test-db-setup.js";
import { reset } from "../scripts/seed.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "./fixtures/care-bear-config.js";

/**
 * Global setup - starts PostgreSQL container and seeds data
 */
export default async function setup() {
	console.log("Starting global test setup...");
	const { db } = await startTestDb();
	console.log("Database container ready, seeding data...");
	console.log("globalThis.testDb is:", globalThis.testDb ? "SET" : "NOT SET");
	await reset(db, careBearSchema, careBearConfig, careBearData);
	console.log("Global test setup complete");
	console.log("Final globalThis.testDb is:", globalThis.testDb ? "SET" : "NOT SET");
}

/**
 * Global teardown - stops PostgreSQL container
 */
export async function teardown() {
	console.log("Starting global test teardown...");
	await stopTestDb();
	console.log("Global test teardown complete");
}