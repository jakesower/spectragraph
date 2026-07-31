import { expect, it, describe, vi } from "vitest";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import utahParksSchema from "../fixtures/utah-parks.schema.json";

describe("finalizers", () => {
	describe("FINALIZED requirement", () => {
		it("throws when handler returns raw data without using finalizers", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValue([{ id: "zion", name: "Zion National Park" }]);

			const config = {
				resources: {
					parks: {
						query: { fetch: mockQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow(/finalize/i);
		});

		it("throws when handler returns object that looks like finalized but lacks symbol", async () => {
			const mockQuery = vi.fn().mockResolvedValue({
				graph: { parks: {} },
				handled: {},
			});

			const config = {
				resources: {
					parks: {
						query: { fetch: mockQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({ type: "parks", select: ["name"] }),
			).rejects.toThrow(/finalize/i);
		});
	});

	describe("handles config", () => {
		it("does not re-apply slice when config declares it handled", async () => {
			const mockQuery = vi.fn().mockImplementation((context, finalizers) => {
				// Handler returns 2 items; config declares slice handled
				// (simulating an API that already applied limit)
				return finalizers.finalizeResources([
					{ id: "zion", name: "Zion" },
					{ id: "arches", name: "Arches" },
				]);
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
							handles: { slice: true },
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name"],
				slice: { limit: 1 },
			});

			// Should get both items because slice was "handled" by the API
			expect(result).toEqual([{ name: "Zion" }, { name: "Arches" }]);
		});

		it("applies slice when config does not declare it handled", async () => {
			const mockQuery = vi.fn().mockImplementation((context, finalizers) => {
				return finalizers.finalizeResources([
					{ id: "zion", name: "Zion" },
					{ id: "arches", name: "Arches" },
				]);
			});

			const config = {
				resources: {
					parks: {
						query: { fetch: mockQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name"],
				slice: { limit: 1 },
			});

			// Should get only 1 item because slice was applied client-side
			expect(result).toEqual([{ name: "Zion" }]);
		});

		it("does not re-apply where when config declares it handled", async () => {
			const mockQuery = vi.fn().mockImplementation((context, finalizers) => {
				// Handler returns only matching items; config declares where handled
				return finalizers.finalizeResources([
					{ id: "zion", name: "Zion", location: "Utah" },
				]);
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
							handles: { where: true },
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			// Query with where clause that would filter out the result if applied
			const result = await store.query({
				type: "parks",
				select: ["name"],
				where: { location: "California" },
			});

			// Should still get result because where was handled by the API
			expect(result).toEqual([{ name: "Zion" }]);
		});

		it("does not re-apply order when config declares it handled", async () => {
			const mockQuery = vi.fn().mockImplementation((context, finalizers) => {
				// Handler returns items in specific order; config declares order handled
				return finalizers.finalizeResources([
					{ id: "zion", name: "Zion" },
					{ id: "arches", name: "Arches" },
				]);
			});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
							handles: { order: true },
						},
					},1
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name"],
				order: { name: "asc" },
			});

			// Should preserve handler's order (Zion, Arches) not alphabetical (Arches, Zion)
			expect(result).toEqual([{ name: "Zion" }, { name: "Arches" }]);
		});
	});

	describe("handles.relationships config", () => {
		it("skips subqueries for relationships declared as handled", async () => {
			const mockParksQuery = vi.fn().mockImplementation((context, finalizers) => {
				// Handler loads parks with activities embedded
				// Graph must be in proper format with type/attributes/relationships
				return finalizers.finalize({
					parks: {
						zion: {
							type: "parks",
							id: "zion",
							attributes: {
								id: "zion",
								name: "Zion",
							},
							relationships: {
								activities: [{ type: "activities", id: "angels-landing" }],
							},
						},
					},
					activities: {
						"angels-landing": {
							type: "activities",
							id: "angels-landing",
							attributes: {
								id: "angels-landing",
								name: "Angels Landing",
								difficulty: "strenuous",
							},
							relationships: {
								park: { type: "parks", id: "zion" },
							},
						},
					},
				});
			});

			const mockActivitiesQuery = vi
				.fn()
				.mockImplementation((context, finalizers) => {
					return finalizers.finalizeResources([]);
				});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: mockParksQuery,
							handles: { relationships: ["activities"] },
						},
					},
					activities: {
						query: { fetch: mockActivitiesQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", { activities: { select: ["name", "difficulty"] } }],
			});

			// Activities handler should not be called
			expect(mockActivitiesQuery).not.toHaveBeenCalled();

			// Result should include activities from the parks handler's graph
			expect(result).toEqual([
				{
					name: "Zion",
					activities: [
						{
							name: "Angels Landing",
							difficulty: "strenuous",
						},
					],
				},
			]);
		});

		it("still loads subqueries for relationships not declared as handled", async () => {
			const mockParksQuery = vi.fn().mockImplementation((context, finalizers) => {
				return finalizers.finalizeResources([
					{
						id: "zion",
						name: "Zion",
						activities: ["angels-landing"],
					},
				]);
			});

			const mockActivitiesQuery = vi
				.fn()
				.mockImplementation((context, finalizers) => {
					return finalizers.finalizeResources([
						{
							id: "angels-landing",
							name: "Angels Landing",
							difficulty: "strenuous",
							park: "zion",
						},
					]);
				});

			const config = {
				resources: {
					parks: {
						query: { fetch: mockParksQuery },
					},
					activities: {
						query: { fetch: mockActivitiesQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", { activities: { select: ["name", "difficulty"] } }],
			});

			// Activities handler should be called
			expect(mockActivitiesQuery).toHaveBeenCalled();

			expect(result).toEqual([
				{
					name: "Zion",
					activities: [
						{
							name: "Angels Landing",
							difficulty: "strenuous",
						},
					],
				},
			]);
		});
	});

	describe("nested queries with handles config", () => {
		it("handles clauses independently at each query level", async () => {
			const mockParksQuery = vi.fn().mockImplementation((context, finalizers) => {
				return finalizers.finalizeResources([
					{ id: "zion", name: "Zion", activities: ["a1", "a2", "a3"] },
					{ id: "arches", name: "Arches", activities: ["a4"] },
				]);
			});

			const mockActivitiesQuery = vi
				.fn()
				.mockImplementation((context, finalizers) => {
					return finalizers.finalizeResources([
						{ id: "a1", name: "Activity 1", park: "zion" },
						{ id: "a2", name: "Activity 2", park: "zion" },
						{ id: "a3", name: "Activity 3", park: "zion" },
						{ id: "a4", name: "Activity 4", park: "arches" },
					]);
				});

			const config = {
				resources: {
					parks: {
						query: {
							fetch: mockParksQuery,
							handles: { slice: true },
						},
					},
					activities: {
						query: { fetch: mockActivitiesQuery },
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: [
					"name",
					{
						activities: {
							select: ["name"],
						},
					},
				],
				slice: { limit: 1 },
			});

			// Parent slice was handled by config, so we get both parks
			// (without handles.slice, we'd only get 1 park)
			expect(result).toEqual([
				{
					name: "Zion",
					activities: [
						{ name: "Activity 1" },
						{ name: "Activity 2" },
						{ name: "Activity 3" },
					],
				},
				{
					name: "Arches",
					activities: [{ name: "Activity 4" }],
				},
			]);
		});
	});
});
