import { createMemoryStore } from "@data-prism/memory-store";
import { runInterfaceTests } from "../../interface-tests/src/index.js";
import { createMultiApiStore } from "../src/multi-api-store.js";

runInterfaceTests((schema) => {
	// Create memory store as the backend
	const memoryStore = createMemoryStore(schema);

	// Create generic handlers for any resource type in the schema
	const resources = Object.fromEntries(
		Object.keys(schema.resources).map(type => [
			type,
			{
				get: async (query) => memoryStore.query(query),
				create: async (resource) => memoryStore.create(resource),
				update: async (resource) => memoryStore.update(resource),
				delete: async (resource) => memoryStore.delete(resource),
			}
		])
	);

	// Multi-API store delegates to memory store for all operations
	return createMultiApiStore(schema, {
		baseURL: "http://test.example.com", // Required for fallback standard handler
		resources,
	});
});
