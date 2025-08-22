import { runInterfaceTests } from "../../interface-tests/src/index.js";
import Database from "better-sqlite3";
import { createTables, seed } from "../src/seed.js";
import { createSQLiteStore } from "../src/sqlite-store.js";
import { careBearConfig } from "./care-bear-config.js";

function createSQLiteStoreFactory(schema, options = {}) {
	const db = Database(":memory:");
	createTables(db, schema, careBearConfig);
	
	if (options.initialData) {
		seed(db, schema, careBearConfig, options.initialData);
	}
	
	return createSQLiteStore(schema, db, careBearConfig);
}

runInterfaceTests(createSQLiteStoreFactory);