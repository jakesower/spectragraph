import { expect, it, describe, vi } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";

const testSchema = {
	resources: {
		theories: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				title: { type: "string" },
				category: { type: "string" },
			},
			relationships: {},
		},
		evidence: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				description: { type: "string" },
				reliability: { type: "string" },
			},
			relationships: {},
		},
		sources: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
				credibility: { type: "string" },
			},
			relationships: {},
		},
	},
};

describe("Manual Cache Mode", () => {
	it("allows handlers to control caching manually", async () => {
		const fetchConspiracy1 = vi
			.fn()
			.mockResolvedValue([
				{ id: "theory1", title: "Moon Landing Hoax", category: "space" },
			]);
		const fetchConspiracy2 = vi
			.fn()
			.mockResolvedValue([
				{ id: "theory2", title: "Flat Earth", category: "space" },
			]);

		const config = {
			cache: {
				enabled: true,
				ttl: 60000,
			},
			resources: {
				evidence: {
					cache: { manual: true }, // Enable manual caching for evidence
					query: {
						fetch: async (ctx) => {
							const { categoryIds, withCache } = ctx;

							// Fetch evidence for each conspiracy category with manual caching
							const evidenceByCategory = await Promise.all(
								categoryIds.map((categoryId) =>
									withCache(`allEvidence-${categoryId}`, async () => {
										if (categoryId === "space") return fetchConspiracy1();
										if (categoryId === "government") {
											return fetchConspiracy2();
										}
										return [];
									}),
								),
							);

							return evidenceByCategory.flat();
						},
					},
				},
				theories: {
					query: {
						fetch: async () => [
							{
								id: "theory1",
								title: "Auto Cached Theory",
								category: "space",
							},
						],
					},
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);

		// First query - should cache per category
		const result1 = await store.query(
			{ type: "evidence", select: ["description"] },
			{ categoryIds: ["space", "government"] },
		);

		expect(fetchConspiracy1).toHaveBeenCalledTimes(1);
		expect(fetchConspiracy2).toHaveBeenCalledTimes(1);
		expect(result1).toHaveLength(2);

		// Second query with same categories - should use cache
		const result2 = await store.query(
			{ type: "evidence", select: ["description"] },
			{ categoryIds: ["space", "government"] },
		);

		expect(fetchConspiracy1).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(fetchConspiracy2).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(result2).toHaveLength(2);

		// Query with only space category - should use cache
		const result3 = await store.query(
			{ type: "evidence", select: ["description"] },
			{ categoryIds: ["space"] },
		);

		expect(fetchConspiracy1).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(result3).toHaveLength(1);
	});

	it("mixes automatic and manual caching in the same store", async () => {
		const theoryHandler = vi
			.fn()
			.mockResolvedValue([
				{ id: "theory1", title: "UFO Cover-Up", category: "aliens" },
			]);
		const manualHandler = vi.fn().mockResolvedValue([
			{
				id: "source1",
				name: "Anonymous Whistleblower",
				credibility: "questionable",
			},
		]);

		const config = {
			cache: {
				enabled: true,
				ttl: 60000,
			},
			resources: {
				theories: {
					// Automatic caching
					query: {
						fetch: theoryHandler,
					},
				},
				sources: {
					cache: { manual: true }, // Manual caching
					query: {
						fetch: async (ctx) => {
							const { withCache, query } = ctx;

							// Manual cache control for sources
							return withCache(`source-${query.id}`, manualHandler);
						},
					},
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);

		// Query theories (automatic caching)
		await store.query({ type: "theories", select: ["title"] });
		await store.query({ type: "theories", select: ["title"] });

		expect(theoryHandler).toHaveBeenCalledTimes(1); // Cached automatically

		// Query sources (manual caching)
		await store.query({ type: "sources", id: "source1", select: ["name"] });
		await store.query({ type: "sources", id: "source1", select: ["name"] });

		expect(manualHandler).toHaveBeenCalledTimes(1); // Cached manually
	});

	it("supports manual mode in special handlers", async () => {
		const multiSourceHandler = vi
			.fn()
			.mockResolvedValue([
				{ id: "source1", name: "Deep Throat", credibility: "high" },
			]);

		const config = {
			cache: { enabled: true },
			resources: {
				sources: {
					query: {
						fetch: async () => {
							throw new Error("Should not be called");
						},
					},
				},
			},
			specialHandlers: [
				{
					test: (query, context) =>
						query.type === "sources" && context.investigatorIds?.length > 1,
					cache: { manual: true }, // Manual mode for special handler
					query: async (ctx) => {
						const { withCache, investigatorIds, query } = ctx;

						// Try each investigator's network until we find the source
						for (const investigatorId of investigatorIds) {
							const result = await withCache(
								`source-${query.id}-investigator-${investigatorId}`,
								async () => {
									return multiSourceHandler();
								},
							);

							if (result.length > 0) return result;
						}
						return [];
					},
				},
			],
		};

		const store = createMultiApiStore(testSchema, config);

		// Query that triggers special handler
		const result = await store.query(
			{ type: "sources", id: "source1", select: ["name"] },
			{ investigatorIds: ["inv1", "inv2"] },
		);

		expect(result).toEqual({ name: "Deep Throat" });
		expect(multiSourceHandler).toHaveBeenCalledTimes(1);

		// Second query - should use cache
		await store.query(
			{ type: "sources", id: "source1", select: ["name"] },
			{ investigatorIds: ["inv1", "inv2"] },
		);

		expect(multiSourceHandler).toHaveBeenCalledTimes(1); // Still 1, cached
	});

	it("passes withCache to all handlers regardless of manual mode", async () => {
		let receivedContext;

		const config = {
			cache: { enabled: true },
			resources: {
				theories: {
					query: {
						fetch: async (ctx) => {
							receivedContext = ctx;
							return [
								{
									id: "theory1",
									title: "Government Mind Control",
									category: "psychology",
								},
							];
						},
					},
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);
		await store.query({ type: "theories", select: ["title"] });

		expect(receivedContext).toBeDefined();
		expect(typeof receivedContext.withCache).toBe("function");
	});
});
