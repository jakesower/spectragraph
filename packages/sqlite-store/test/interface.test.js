import { careBearData, runInterfaceTests } from "@spectragraph/interface-tests";
import Database from "better-sqlite3";
import { createTables, seed } from "../src/seed.js";
import { sqliteStore } from "../src/sqlite-store.js";
import { careBearConfig } from "./care-bear-config.js";

function createSQLiteTestStore(schema, options = {}) {
	const db = Database(":memory:");

	// Add REGEXP function support for testing
	db.function("REGEXP", (pattern, text) => {
		try {
			// Handle inline flags like (?i), (?m), (?s) by converting to RegExp flags
			let flags = "";
			let cleanPattern = pattern;

			// Extract inline flags and convert to RegExp flags
			const flagMap = {
				i: "i", // case insensitive
				m: "m", // multiline
				s: "s", // dotall (single line)
			};

			// Look for inline flags like (?i), (?m), (?s), (?im), etc.
			const inlineFlagMatch = cleanPattern.match(/^\(\?([ims]+)\)/);
			if (inlineFlagMatch) {
				const inlineFlags = inlineFlagMatch[1];
				for (const flag of inlineFlags) {
					if (flagMap[flag]) {
						flags += flagMap[flag];
					}
				}
				// Remove the inline flag syntax from pattern
				cleanPattern = cleanPattern.replace(/^\(\?[ims]+\)/, "");
			}

			const regex = new RegExp(cleanPattern, flags);
			return regex.test(text) ? 1 : 0;
		} catch {
			return 0;
		}
	});

	createTables(db, schema, careBearConfig);

	// Only seed if initialData is explicitly provided and matches careBearData
	if (options.initialData && options.initialData === careBearData) {
		seed(db, schema, careBearConfig, careBearData);
	}

	return sqliteStore(schema, { db, resources: careBearConfig.resources });
}

runInterfaceTests(createSQLiteTestStore);
