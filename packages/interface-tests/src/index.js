import { describe, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { runQueryTests } from "./query.test.js";
import { runCreateTests } from "./create.test.js";
import { runUpdateTests } from "./update.test.js";
import { runDeleteTests } from "./delete.test.js";
import { runUpsertTests } from "./upsert.test.js";
import { runMergeTests } from "./merge.test.js";

export function runInterfaceTests(createStore, options = {}) {
	describe("Store Interface Tests", () => {
		if (options.beforeAll) {
			beforeAll(options.beforeAll);
		}

		if (options.beforeEach) {
			beforeEach(options.beforeEach);
		}

		if (options.afterEach) {
			afterEach(options.afterEach);
		}

		if (options.afterAll) {
			afterAll(options.afterAll);
		}

		runQueryTests(createStore);
		runCreateTests(createStore);
		runUpdateTests(createStore);
		runDeleteTests(createStore);
		runUpsertTests(createStore);
		runMergeTests(createStore);
	});
}

// Export individual test functions for granular usage
export { runQueryTests } from "./query.test.js";
export { runCreateTests } from "./create.test.js";
export { runUpdateTests } from "./update.test.js";
export { runDeleteTests } from "./delete.test.js";
export { runUpsertTests } from "./upsert.test.js";
export { runMergeTests } from "./merge.test.js";

// Re-export fixtures
export {
	careBearSchema,
	soccerSchema,
	geojsonSchema,
	jsonApiSchema,
	careBearData,
	careBearDataFlat,
} from "./fixtures/index.js";
