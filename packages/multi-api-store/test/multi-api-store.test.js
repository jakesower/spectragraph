import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import utahParksSchema from "./fixtures/utah-parks.schema.json";

describe("createMultiApiStore", () => {
	it("supports forceRefresh to clear cache and fetch fresh data", async () => {
		const mockQuery = vi
			.fn()
			.mockResolvedValueOnce([{ id: "1", name: "First Call" }])
			.mockResolvedValueOnce([{ id: "1", name: "Second Call" }]);

		const config = {
			cache: { enabled: true, ttl: 60000 },
			resources: {
				parks: { query: { fetch: mockQuery } },
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		// Call 1: Normal caching
		const result1 = await store.query({ type: "parks", select: ["name"] });

		// Call 2: Should use cache (normal behavior)
		const result2 = await store.query({ type: "parks", select: ["name"] });

		// Call 3: With forceRefresh, should clear cache and fetch fresh
		const result3 = await store.query(
			{ type: "parks", select: ["name"] },
			{ forceRefresh: true },
		);

		// Call 4: Should now use the refreshed cache
		const result4 = await store.query({ type: "parks", select: ["name"] });

		expect(mockQuery).toHaveBeenCalledTimes(2); // Call 1 + call 3 (force refresh)
		expect(result1[0].name).toBe("First Call");
		expect(result2[0].name).toBe("First Call"); // Cached from call 1
		expect(result3[0].name).toBe("Second Call"); // Fresh fetch due to force refresh
		expect(result4[0].name).toBe("Second Call"); // Uses refreshed cache
	});

	it("queries parks with mocked get handler", async () => {
		const mockQuery = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "Zion National Park",
				location: "Utah",
				established: 1919,
				bestSeason: "spring",
			},
		]);

		const config = {
			specialHandlers: [],
			resources: {
				parks: {
					query: {
						fetch: mockQuery,
					},
				},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const result = await store.query({
			type: "parks",
			select: ["name", "location"],
		});

		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				query: {
					type: "parks",
					select: { name: "name", location: "location" },
				},
				schema: utahParksSchema,
			}),
		);

		expect(result).toEqual([
			{
				name: "Zion National Park",
				location: "Utah",
			},
		]);
	});

	it("queries parks with mappers", async () => {
		const mockQuery = vi.fn().mockResolvedValue([
			{
				id: "zion",
				parkName: "Zion National Park",
				state: "Utah",
				yearEstablished: 1919,
				description: "Famous for towering sandstone cliffs",
			},
		]);

		const config = {
			specialHandlers: [],
			resources: {
				parks: {
					query: {
						fetch: mockQuery,
						mappers: {
							name: "parkName",
							location: "state",
						},
					},
				},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const result = await store.query({
			type: "parks",
			select: ["name", "location"],
		});

		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				query: {
					type: "parks",
					select: { name: "name", location: "location" },
				},
				schema: utahParksSchema,
			}),
		);

		expect(result).toEqual([
			{
				name: "Zion National Park",
				location: "Utah",
			},
		]);
	});

	it("queries parks with related activities", async () => {
		const mockParksGet = vi.fn().mockResolvedValue([
			{
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				established: 1919,
				bestSeason: "spring",
				activities: ["angels-landing"],
			},
		]);

		const mockActivitiesGet = vi.fn().mockResolvedValue([
			{
				id: "angels-landing",
				name: "Angels Landing",
				difficulty: "strenuous",
				duration: 240,
				description: "Iconic hike with chains",
				seasonAvailable: ["spring", "summer", "fall"],
				park: "zion",
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
						fetch: mockActivitiesGet,
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
			expect.objectContaining({
				schema: utahParksSchema,
				parentQuery: expect.any(Object),
				query: {
					type: "activities",
					select: { name: "name", difficulty: "difficulty" },
				},
			}),
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
		]);
	});

	it("queries parks with related activities with a configured relationship field", async () => {
		const mockParksGet = vi.fn().mockResolvedValue([
			{
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				established: 1919,
				bestSeason: "spring",
				activities: ["angels-landing"],
			},
		]);

		const mockActivitiesGet = vi.fn().mockResolvedValue([
			{
				id: "angels-landing",
				name: "Angels Landing",
				difficulty: "strenuous",
				duration: 240,
				park_id: "zion",
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
						fetch: mockActivitiesGet,
						mappers: {
							park: "park_id",
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
			expect.objectContaining({
				schema: utahParksSchema,
				parentQuery: expect.any(Object),
				query: {
					type: "activities",
					select: { name: "name", difficulty: "difficulty" },
				},
			}),
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
		]);
	});

	it("uses special handlers to customize data loading", async () => {
		const mockParksGet = vi.fn().mockResolvedValue([
			{
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				established: 1919,
				bestSeason: "spring",
				activities: ["angels-landing"],
			},
		]);

		const mockActivitiesGet = vi.fn().mockResolvedValue([
			{
				id: "angels-landing",
				name: "Standard Activity",
				difficulty: "moderate",
				park: "zion",
			},
		]);

		const mockSpecialInvestigationsHandler = vi.fn().mockResolvedValue([
			{
				id: "angels-landing",
				name: "Special Activity from Parks Endpoint",
				difficulty: "strenuous",
				park: "zion",
			},
		]);

		const config = {
			specialHandlers: [
				{
					test: (query, context) =>
						query.type === "activities" &&
						context.parentQuery?.type === "parks",
					query: mockSpecialInvestigationsHandler,
				},
			],
			resources: {
				parks: {
					query: {
						fetch: mockParksGet,
					},
				},
				activities: {
					query: {
						fetch: mockActivitiesGet,
					},
				},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const result = await store.query({
			type: "parks",
			select: ["name", { activities: { select: ["name", "difficulty"] } }],
		});

		// Should use special handler, not regular activities get
		expect(mockActivitiesGet).not.toHaveBeenCalled();
		expect(mockSpecialInvestigationsHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: utahParksSchema,
				parentQuery: expect.objectContaining({ type: "parks" }),
				query: {
					type: "activities",
					select: { name: "name", difficulty: "difficulty" },
				},
			}),
		);

		expect(result).toEqual([
			{
				name: "Zion National Park",
				activities: [
					{
						name: "Special Activity from Parks Endpoint",
						difficulty: "strenuous",
					},
				],
			},
		]);
	});

	describe("CUD Operations", () => {
		it("creates a resource when create handler is available", async () => {
			const mockCreate = vi.fn().mockResolvedValue({
				id: "arches",
				name: "Arches National Park",
				location: "Utah",
				established: 1971,
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: vi.fn(),
						},
						create: {
							fetch: mockCreate,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const newPark = {
				type: "parks",
				attributes: {
					name: "Arches National Park",
					location: "Utah",
					established: 1971,
				},
			};

			const result = await store.create(newPark);

			expect(mockCreate).toHaveBeenCalledWith(
				newPark,
				expect.objectContaining({
					schema: utahParksSchema,
				}),
			);
			expect(result).toEqual({
				id: "arches",
				name: "Arches National Park",
				location: "Utah",
				established: 1971,
			});
		});

		it("uses empty baseURL when none provided for standard handler", async () => {
			const config = {
				// No baseURL - should default to empty string
				resources: {
					parks: {
						query: vi.fn(),
						// no create handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const newPark = {
				type: "parks",
				attributes: { name: "New Skeptic" },
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ id: "new-id", ...newPark }),
			});

			await store.create(newPark);

			expect(global.fetch).toHaveBeenCalledWith("/parks", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newPark),
			});
		});

		it("updates a resource when update handler is available", async () => {
			const mockUpdate = vi.fn().mockResolvedValue({
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				bestSeason: "fall",
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: vi.fn(),
						},
						update: {
							fetch: mockUpdate,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const updatePark = {
				type: "parks",
				id: "zion",
				attributes: {
					bestSeason: "fall",
				},
			};

			const result = await store.update(updatePark);

			expect(mockUpdate).toHaveBeenCalledWith(
				updatePark,
				expect.objectContaining({
					schema: utahParksSchema,
				}),
			);
			expect(result).toEqual({
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				bestSeason: "fall",
			});
		});

		it("deletes a resource when delete handler is available", async () => {
			const mockDelete = vi.fn().mockResolvedValue({
				type: "parks",
				id: "1",
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: vi.fn(),
						},
						delete: {
							fetch: mockDelete,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const deletePark = {
				type: "parks",
				id: "1",
			};

			const result = await store.delete(deletePark);

			expect(mockDelete).toHaveBeenCalledWith(
				deletePark,
				expect.objectContaining({
					schema: utahParksSchema,
				}),
			);
			expect(result).toEqual({
				type: "parks",
				id: "1",
			});
		});

		it.skip("validates resource before creation", async () => {
			// Skip for now - the schema doesn't have required attributes configured
			// to test validation failures. This would need a more complex schema setup.
		});
	});

	describe("Caching", () => {
		it("caches query results when caching is enabled", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValueOnce([{ id: "1", name: "Zion National Park" }])
				.mockResolvedValueOnce([{ id: "2", name: "Different Data" }]);

			const config = {
				cache: {
					enabled: true,
					ttl: 1000, // 1 second
				},
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const query = {
				type: "parks",
				select: ["name"],
			};

			// First call should hit the API
			const result1 = await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);
			expect(result1).toEqual([{ name: "Zion National Park" }]);

			// Second call should use cache
			const result2 = await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, not called again
			expect(result2).toEqual([{ name: "Zion National Park" }]);
		});

		it("does not cache when caching is disabled", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValueOnce([{ id: "1", name: "Zion National Park" }])
				.mockResolvedValueOnce([{ id: "1", name: "Zion National Park" }]);

			const config = {
				cache: {
					enabled: false,
				},
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const query = {
				type: "parks",
				select: ["name"],
			};

			// First call
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);

			// Second call should hit API again
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(2);
		});

		it("clears cache when creating a resource", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValue([{ id: "1", name: "Zion National Park" }]);
			const mockCreate = vi.fn().mockResolvedValue({
				id: "capitol-reef",
				name: "Capitol Reef National Park",
				location: "Utah",
			});

			const config = {
				cache: {
					enabled: true,
					ttl: 60000, // 1 minute
				},
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
						create: {
							fetch: mockCreate,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const query = {
				type: "parks",
				select: ["name"],
			};

			// Query first to populate cache
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);

			// Query again should use cache (verify caching is working)
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, should use cache

			// Create a resource (should clear cache)
			await store.create({
				type: "parks",
				attributes: {
					name: "Capitol Reef National Park",
					location: "Utah",
					established: 1971,
				},
			});

			// Query again should hit API (cache was cleared)
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(2);
		});
	});
});

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

	it("handles HTTP errors in standard handler", async () => {
		// Mock fetch to return 404 error
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
			url: "https://api.nps.example.org/parks/nonexistent",
			headers: new Map([["content-type", "application/json"]]),
			json: () => Promise.resolve({ message: "Park not found" }),
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

		await expect(
			store.query({
				type: "parks",
				id: "nonexistent",
				select: ["name"],
			}),
		).rejects.toThrow("Park not found");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/nonexistent",
		);
	});

	it("creates resource with standard handler", async () => {
		// Mock fetch for POST request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "canyonlands",
				name: "Canyonlands National Park",
				location: "Utah",
				established: 1964,
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom create handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const newPark = {
			type: "parks",
			attributes: {
				name: "Canyonlands National Park",
				location: "Utah",
				established: 1964,
			},
		};

		const result = await store.create(newPark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newPark),
			},
		);
		expect(result).toEqual({
			id: "canyonlands",
			name: "Canyonlands National Park",
			location: "Utah",
			established: 1964,
		});
	});

	it("updates resource with standard handler", async () => {
		// Mock fetch for PATCH request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				bestSeason: "winter",
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom update handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const updatedPark = {
			type: "parks",
			id: "zion",
			attributes: {
				bestSeason: "winter",
			},
		};

		const result = await store.update(updatedPark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/zion",
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPark),
			},
		);
		expect(result).toEqual({
			id: "zion",
			name: "Zion National Park",
			location: "Utah",
			bestSeason: "winter",
		});
	});

	it("deletes resource with standard handler", async () => {
		// Mock fetch for DELETE request (empty response)
		global.fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => "",
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom delete handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const deletePark = {
			type: "parks",
			id: "zion",
		};

		const result = await store.delete(deletePark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/zion",
			{
				method: "DELETE",
			},
		);
		// Should return original resource when API returns empty response
		expect(result).toEqual(deletePark);
	});

	it("uses standard handler when no custom create handler provided", async () => {
		// Mock fetch for standard handler
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "arches",
				name: "Arches National Park",
				location: "Utah",
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.example.org",
			},
			resources: {
				parks: {
					// no create handler - should use standard handler
				},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const newPark = {
			type: "parks",
			attributes: { name: "Arches National Park" },
		};

		const result = await store.create(newPark);

		expect(global.fetch).toHaveBeenCalledWith("https://api.example.org/parks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(newPark),
		});
		expect(result).toEqual({
			id: "arches",
			name: "Arches National Park",
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
});
