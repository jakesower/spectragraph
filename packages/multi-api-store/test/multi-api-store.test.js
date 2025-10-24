import { expect, it, describe, vi } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import utahParksSchema from "./fixtures/utah-parks.schema.json";

describe("createMultiApiStore", () => {
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
