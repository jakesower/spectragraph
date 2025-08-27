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

// Export individual test functions for granular usage
export { runQueryTests } from "./query.test.js";
export { runCreateTests } from "./create.test.js";
export { runUpdateTests } from "./update.test.js";
export { runDeleteTests } from "./delete.test.js";
export { runUpsertTests } from "./upsert.test.js";

// Re-export fixtures
export {
	careBearSchema,
	soccerSchema,
	geojsonSchema,
	jsonApiSchema,
	careBearData,
	careBearDataFlat,
} from "./fixtures/index.js";
