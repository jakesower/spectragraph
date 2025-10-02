import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import utahParksSchema from "./fixtures/utah-parks.schema.json";

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("queries parks with real handler and mocked fetch", async () => {
		// Mock fetch to return park data
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => [
				{
					id: "zion",
					name: "Zion National Park",
					location: "Utah",
					established: 1919,
					bestSeason: "spring",
				},
			],
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const result = await store.query({
			type: "parks",
			select: ["name", "location"],
		});

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks",
		);
		expect(result).toEqual([
			{
				name: "Zion National Park",
				location: "Utah",
			},
		]);
	});

	it("queries single park with real handler and mocked fetch", async () => {
		// Mock fetch to return single park data
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				established: 1919,
				bestSeason: "spring",
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const result = await store.query({
			type: "parks",
			id: "zion",
			select: ["name", "location"],
		});

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/zion",
		);
		expect(result).toEqual({
			name: "Zion National Park",
			location: "Utah",
		});
	});

	describe("error handling during query execution", () => {
		it("handles async errors from middleware", async () => {
			const badMiddleware = async () => {
				throw new Error("Middleware async error");
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					parks: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Middleware async error");
		});

		it("handles HTTP error responses with status and data", async () => {
			const httpError = new Error("HTTP Error");
			httpError.response = {
				status: 404,
				data: { message: "Resource not found" },
			};

			const badMiddleware = async () => {
				throw httpError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					parks: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("HTTP Error");
		});

		it("handles HTTP error responses without custom message", async () => {
			const httpError = new Error("HTTP Error");
			httpError.response = {
				status: 500,
				data: {},
			};

			const badMiddleware = async () => {
				throw httpError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					parks: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("HTTP Error");
		});

		it("handles network errors (no response received)", async () => {
			const networkError = new Error("Network timeout");
			networkError.request = { url: "https://api.example.com/parks" };

			const badMiddleware = async () => {
				throw networkError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					parks: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Network timeout");
		});

		it("handles errors from resource handlers", async () => {
			const resourceError = new Error("Resource handler error");

			const config = {
				resources: {
					parks: {
						query: {
							fetch: vi.fn().mockRejectedValue(resourceError),
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Resource handler error");
		});

		it("handles fetch network errors from standard handler", async () => {
			// Mock fetch to throw a network error
			global.fetch = vi.fn().mockImplementation(() => {
				const networkError = new Error("fetch failed");
				networkError.request = { url: "https://api.example.com/parks" };
				return Promise.reject(networkError);
			});

			const config = {
				request: {
					baseURL: "https://api.example.com",
				},
				resources: {
					parks: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("fetch failed");
		});

		it("handles HTTP 404 errors from standard handler", async () => {
			// Mock fetch to return a 404 response
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
				url: "https://api.example.com/parks",
				headers: new Map([["content-type", "application/json"]]),
				json: () => Promise.resolve({ message: "Resource not found" }),
			});

			const config = {
				request: {
					baseURL: "https://api.example.com",
				},
				resources: {
					parks: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Resource not found");
		});

		it("handles HTTP 500 errors from standard handler", async () => {
			// Mock fetch to return a 500 response
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				url: "https://api.example.com/parks",
				headers: new Map([["content-type", "application/json"]]),
				json: () => Promise.resolve({ message: "Database connection failed" }),
			});

			const config = {
				request: {
					baseURL: "https://api.example.com",
				},
				resources: {
					parks: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Database connection failed");
		});

		it("handles HTTP errors from standard handler with fallback to statusText", async () => {
			// Mock fetch to return a 500 response with invalid JSON
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				statusText: "Forbidden",
				url: "https://api.example.com/parks",
				headers: new Map([["content-type", "text/html"]]),
				json: () => Promise.reject(new Error("Not JSON")),
			});

			const config = {
				request: {
					baseURL: "https://api.example.com",
				},
				resources: {
					parks: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow("Forbidden");
		});
	});

	describe("dependent subqueries", () => {
		it("receives a parentResultPromise that has results", async () => {
			const mockParksGet = vi.fn().mockResolvedValue([
				{
					id: "zion",
					name: "Zion National Park",
					location: "Utah",
					established: 1919,
				},
				{
					id: "arches",
					name: "Arches National Park",
					location: "Utah",
					established: 1971,
				},
			]);

			const mockActivitiesGet = vi.fn().mockResolvedValue([
				{
					id: "angels-landing",
					name: "Angels Landing",
					difficulty: "strenuous",
					duration: 240,
					description: "Iconic hike with chains",
					park: "zion",
				},
				{
					id: "delicate-arch",
					name: "Delicate Arch",
					difficulty: "moderate",
					duration: 180,
					description: "Hike to the most iconic site in Utah",
					park: "arches",
				},
			]);

			const config = {
				specialHandlers: [],
				resources: {
					parks: {
						query: {
							fetch: mockParksGet,
						},
					},
					activities: {
						query: {
							fetch: async (context) => {
								const parent = await context.parentResultPromise;
								const queryStr = context.queryStr
									? `${context.queryStr ?? ""}&park=${parent.map((p) => p.id).join(",")}`
									: `?park=${parent.map((p) => p.id).join(",")}`;

								const url = `https://api.nps.example.org/activities${queryStr}`;

								return mockActivitiesGet(url);
							},
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", { activities: { select: ["name", "difficulty"] } }],
			});

			expect(mockParksGet).toHaveBeenCalledWith(
				expect.objectContaining({
					schema: utahParksSchema,
					query: {
						type: "parks",
						select: { name: "name", activities: expect.any(Object) },
					},
				}),
			);

			expect(mockActivitiesGet).toHaveBeenCalledWith(
				"https://api.nps.example.org/activities?park=zion,arches",
			);

			expect(result).toEqual([
				{
					name: "Zion National Park",
					activities: [
						{
							name: "Angels Landing",
							difficulty: "strenuous",
						},
					],
				},
				{
					name: "Arches National Park",
					activities: [
						{
							name: "Delicate Arch",
							difficulty: "moderate",
						},
					],
				},
			]);
		});
	});
});
