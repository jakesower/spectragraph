import { describe } from "vitest";
import { runQueryTests } from "./query.test.js";
import { runCreateTests } from "./create.test.js";
import { runUpdateTests } from "./update.test.js";
import { runDeleteTests } from "./delete.test.js";
import { runUpsertTests } from "./upsert.test.js";

export function runInterfaceTests(createStore) {
	describe("Store Interface Tests", () => {
		runQueryTests(createStore);
		runCreateTests(createStore);
		runUpdateTests(createStore);
		runDeleteTests(createStore);
		runUpsertTests(createStore);
	});
}

// Re-export fixtures
export {
	careBearSchema,
	soccerSchema,
	geojsonSchema,
	jsonApiSchema,
	jsonSchemaTestingSchema,
	careBearData,
	careBearDataFlat,
} from "./fixtures/index.js";