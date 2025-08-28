import { careBearData, runQueryTests } from "@data-prism/interface-tests";
import Database from "better-sqlite3";
import { createTables, seed } from "../src/seed.js";
import { sqliteStore } from "../src/sqlite-store.js";
import { careBearConfig } from "./care-bear-config.js";

function createSQLiteTestStore(schema, options = {}) {
	const db = Database(":memory:");
	createTables(db, schema, careBearConfig);

	if (options.initialData) {
		seed(db, schema, careBearConfig, careBearData);
	}

	return sqliteStore(schema, { db, resources: careBearConfig.resources });
}

runQueryTests(createSQLiteTestStore);
