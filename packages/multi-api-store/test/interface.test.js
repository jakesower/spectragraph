import { vi } from "vitest";
import { createMemoryStore } from "@spectragraph/memory-store";
import {
	careBearData,
	careBearSchema,
	runInterfaceTests,
} from "../../interface-tests/src/index.js";
import { createMultiApiStore } from "../src/multi-api-store.js";
import { mapValues } from "es-toolkit";

function parseUrl(url) {
	const urlObj = new URL(url);
	const pathSegments = urlObj.pathname.split("/").filter(Boolean);

	if (pathSegments.length >= 1) {
		const type = pathSegments[0];
		const id = pathSegments[1] ?? undefined;
		return { type, id };
	}

	return { type: undefined, id: undefined };
}

// Create memory store as the backend with any provided config (like initialData)
const memoryStore = createMemoryStore(careBearSchema, {
	initialData: careBearData,
});

const responders = {
	GET: async (url) => {
		const { type, id } = parseUrl(url);
		const query = {
			type,
			id,
			select: [
				"*",
				mapValues(careBearSchema.resources[type].relationships, () => "*"),
			],
		};

		try {
			const result = await memoryStore.query(query);
			return {
				ok: true,
				status: 200,
				headers: new Headers({ "Content-Type": "application/json" }),
				json: async () => result,
			};
		} catch (err) {
			return {
				ok: false,
				status: 422,
				headers: new Headers({ "Content-Type": "application/json" }),
				json: async () => ({
					message: err.message,
				}),
			};
		}
	},
	POST: async (url, info) => {
		const resource = JSON.parse(info.body);
		const result = await memoryStore.create(resource);

		return {
			ok: true,
			status: 201,
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => result,
		};
	},
	PATCH: async (url, info) => {
		const resource = JSON.parse(info.body);
		const result = await memoryStore.update(resource);

		return {
			ok: true,
			status: 200,
			headers: new Headers({ "Content-Type": "application/json" }),
			json: async () => result,
		};
	},
	DELETE: async (url) => {
		const { type, id } = parseUrl(url);
		await memoryStore.delete({ type, id });
		return {
			ok: true,
			status: 204,
			headers: new Headers({ "Content-Type": "application/json" }),
			text: async () => "",
		};
	},
};

runInterfaceTests(
	(schema) => {
		// Create generic handlers for any resource type in the schema
		const resources = mapValues(schema.resources, () => ({}));

		// Multi-API store delegates to memory store for all operations
		return createMultiApiStore(schema, {
			baseURL: "http://test.example.com", // Required for fallback standard handler
			resources,
		});
	},
	{
		beforeAll: () => {
			const mockFetch = vi.fn().mockImplementation(async (url, info = {}) => {
				const { method = "GET" } = info;
				return responders[method](url, info);
			});
			vi.stubGlobal("fetch", mockFetch);
		},
		afterAll: () => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		},
	},
);
