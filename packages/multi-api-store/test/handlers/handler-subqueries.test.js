import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import utahParksSchema from "../fixtures/utah-parks.schema.json";

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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
					query: expect.objectContaining({
						type: "parks",
						select: { name: "name", activities: expect.any(Object) },
					}),
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
