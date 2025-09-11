import { expect, it, describe, vi } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";

const testSchema = {
	resources: {
		organizations: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
			},
			relationships: {},
		},
		exposures: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				data: { type: "string" },
			},
			relationships: {},
		},
		assets: {
			idAttribute: "id",
			attributes: {
				id: { type: "string" },
				address: { type: "string" },
			},
			relationships: {},
		},
	},
};

describe("Manual Cache Mode", () => {
	it("allows handlers to control caching manually", async () => {
		const fetchOrg1 = vi
			.fn()
			.mockResolvedValue([{ id: "org1", name: "Org 1" }]);
		const fetchOrg2 = vi
			.fn()
			.mockResolvedValue([{ id: "org2", name: "Org 2" }]);

		const config = {
			cache: {
				enabled: true,
				defaultTTL: 60000,
			},
			resources: {
				exposures: {
					cache: { manual: true }, // Enable manual caching for exposures
					get: async (ctx) => {
						const { organizationIds, withCache, query } = ctx;

						// Replicate the redzone-store exposures pattern
						const exposuresByOrg = await Promise.all(
							organizationIds.map((orgId) =>
								withCache(`allExposures-${orgId}`, async () => {
									if (orgId === "org1") return fetchOrg1();
									if (orgId === "org2") return fetchOrg2();
									return [];
								}),
							),
						);

						return exposuresByOrg.flat();
					},
				},
				organizations: {
					// Automatic caching (default)
					get: async () => [{ id: "org1", name: "Auto Cached Org" }],
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);

		// First query - should cache per organization
		const result1 = await store.query(
			{ type: "exposures", select: ["data"] },
			{ organizationIds: ["org1", "org2"] },
		);

		expect(fetchOrg1).toHaveBeenCalledTimes(1);
		expect(fetchOrg2).toHaveBeenCalledTimes(1);
		expect(result1).toHaveLength(2);

		// Second query with same orgs - should use cache
		const result2 = await store.query(
			{ type: "exposures", select: ["data"] },
			{ organizationIds: ["org1", "org2"] },
		);

		expect(fetchOrg1).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(fetchOrg2).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(result2).toHaveLength(2);

		// Query with only org1 - should use cache for org1
		const result3 = await store.query(
			{ type: "exposures", select: ["data"] },
			{ organizationIds: ["org1"] },
		);

		expect(fetchOrg1).toHaveBeenCalledTimes(1); // Still 1, cached
		expect(result3).toHaveLength(1);
	});

	it("mixes automatic and manual caching in the same store", async () => {
		const orgHandler = vi
			.fn()
			.mockResolvedValue([{ id: "org1", name: "Org 1" }]);
		const manualHandler = vi
			.fn()
			.mockResolvedValue([{ id: "asset1", address: "123 Main St" }]);

		const config = {
			cache: {
				enabled: true,
				defaultTTL: 60000,
			},
			resources: {
				organizations: {
					// Automatic caching
					get: orgHandler,
				},
				assets: {
					cache: { manual: true }, // Manual caching
					get: async (ctx) => {
						const { withCache, query } = ctx;

						// Manual cache control
						return withCache(`asset-${query.id}`, manualHandler);
					},
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);

		// Query organizations (automatic caching)
		await store.query({ type: "organizations", select: ["name"] });
		await store.query({ type: "organizations", select: ["name"] });

		expect(orgHandler).toHaveBeenCalledTimes(1); // Cached automatically

		// Query assets (manual caching)
		await store.query({ type: "assets", id: "asset1", select: ["address"] });
		await store.query({ type: "assets", id: "asset1", select: ["address"] });

		expect(manualHandler).toHaveBeenCalledTimes(1); // Cached manually
	});

	it("supports manual mode in special handlers", async () => {
		const multiOrgHandler = vi
			.fn()
			.mockResolvedValue([{ id: "asset1", address: "Found" }]);

		const config = {
			cache: { enabled: true },
			resources: {
				assets: {
					get: async () => {
						throw new Error("Should not be called");
					},
				},
			},
			specialHandlers: [
				{
					test: (query, context) =>
						query.type === "assets" && context.organizationIds?.length > 1,
					cache: { manual: true }, // Manual mode for special handler
					handler: async (ctx) => {
						const { withCache, organizationIds, query } = ctx;

						// Try each org until we find the asset
						for (const orgId of organizationIds) {
							const result = await withCache(
								`asset-${query.id}-org-${orgId}`,
								async () => {
									return multiOrgHandler();
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
			{ type: "assets", id: "asset1", select: ["address"] },
			{ organizationIds: ["org1", "org2"] },
		);

		expect(result).toEqual({ address: "Found" });
		expect(multiOrgHandler).toHaveBeenCalledTimes(1);

		// Second query - should use cache
		await store.query(
			{ type: "assets", id: "asset1", select: ["address"] },
			{ organizationIds: ["org1", "org2"] },
		);

		expect(multiOrgHandler).toHaveBeenCalledTimes(1); // Still 1, cached
	});

	it("passes withCache to all handlers regardless of manual mode", async () => {
		let receivedContext;

		const config = {
			cache: { enabled: true },
			resources: {
				organizations: {
					get: async (ctx) => {
						receivedContext = ctx;
						return [{ id: "org1", name: "Org 1" }];
					},
				},
			},
		};

		const store = createMultiApiStore(testSchema, config);
		await store.query({ type: "organizations", select: ["name"] });

		expect(receivedContext).toBeDefined();
		expect(typeof receivedContext.withCache).toBe("function");
	});
});
