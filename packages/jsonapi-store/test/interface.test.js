import { runQueryTests } from "@spectragraph/interface-tests";
import { createJSONAPIStore } from "../src/jsonapi-store.js";
import { makeRequest } from "./helpers.js";

// Create a factory function that creates a jsonapi-store configured for testing
function createTestStore(schema) {
	return createJSONAPIStore(schema, {
		baseURL: "http://127.0.0.1:3000",
		transport: { get: makeRequest },
	});
}

// Run only the query interface tests since that's what jsonapi-store implements
runQueryTests(createTestStore);
