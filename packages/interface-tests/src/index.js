import { describe } from "vitest";
import { runQueryTests } from "./query-tests.js";
import { runCreateTests } from "./create-tests.js";
import { runUpdateTests } from "./update-tests.js";
import { runDeleteTests } from "./delete-tests.js";
import { runUpsertTests } from "./upsert-tests.js";

export function runInterfaceTests(storeFactory) {
	describe("Store Interface Tests", () => {
		runQueryTests(storeFactory);
		runCreateTests(storeFactory);
		runUpdateTests(storeFactory);
		runDeleteTests(storeFactory);
		runUpsertTests(storeFactory);
	});
}