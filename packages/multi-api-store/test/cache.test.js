import { expect, it, describe, vi } from "vitest";
import { createCache } from "../src/cache.js";

describe("createCache", () => {
	it("creates cache with default configuration", () => {
		const cache = createCache();

		expect(cache.config.enabled).toBe(false);
		expect(cache.config.defaultTTL).toBe(5 * 60 * 1000);
		expect(typeof cache.config.keyGenerator).toBe("function");
	});

	it("creates cache with custom configuration", () => {
		const customKeyGenerator = () => "custom-key";
		const cache = createCache({
			enabled: true,
			defaultTTL: 10000,
			keyGenerator: customKeyGenerator,
		});

		expect(cache.config.enabled).toBe(true);
		expect(cache.config.defaultTTL).toBe(10000);
		expect(cache.config.keyGenerator).toBe(customKeyGenerator);
	});

	it("bypasses cache when disabled", () => {
		const cache = createCache({ enabled: false });
		const fetcher = vi.fn().mockReturnValue("result");

		const result1 = cache.withCache("key1", fetcher);
		const result2 = cache.withCache("key1", fetcher);

		expect(result1).toBe("result");
		expect(result2).toBe("result");
		expect(fetcher).toHaveBeenCalledTimes(2); // Called twice, not cached
	});

	it("caches results when enabled", () => {
		const cache = createCache({ enabled: true, defaultTTL: 60000 });
		const fetcher = vi.fn().mockReturnValue("result");

		const result1 = cache.withCache("key1", fetcher);
		const result2 = cache.withCache("key1", fetcher);

		expect(result1).toBe("result");
		expect(result2).toBe("result");
		expect(fetcher).toHaveBeenCalledTimes(1); // Called once, second was cached
	});

	it("clears cache by type", () => {
		const cache = createCache({ enabled: true });
		const fetcher1 = vi.fn().mockReturnValue("result1");
		const fetcher2 = vi.fn().mockReturnValue("result2");

		// Cache some results with different types
		cache.withCache('{"type":"users","query":{}}', fetcher1);
		cache.withCache('{"type":"posts","query":{}}', fetcher2);

		// Clear only users cache
		cache.clearByType("users");

		// Users cache should be cleared, posts should remain
		cache.withCache('{"type":"users","query":{}}', fetcher1);
		cache.withCache('{"type":"posts","query":{}}', fetcher2);

		expect(fetcher1).toHaveBeenCalledTimes(2); // Called again after clear
		expect(fetcher2).toHaveBeenCalledTimes(1); // Still cached
	});

	it("clears all cache", () => {
		const cache = createCache({ enabled: true });
		const fetcher = vi.fn().mockReturnValue("result");

		cache.withCache("key1", fetcher);
		cache.withCache("key2", fetcher);

		// Verify cache has entries by testing behavior
		cache.withCache("key1", fetcher);
		cache.withCache("key2", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(2); // Still 2 calls, cached

		cache.clear();

		// After clear, should fetch again
		cache.withCache("key1", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(3); // New fetch after clear
	});

	it("respects TTL and expires cached entries", async () => {
		const cache = createCache({ enabled: true, defaultTTL: 10 }); // 10ms TTL
		const fetcher = vi.fn().mockReturnValue("result");

		cache.withCache("key1", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Should use cache immediately
		cache.withCache("key1", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Wait for TTL to expire
		await new Promise((resolve) => setTimeout(resolve, 15));

		// Should call fetcher again after expiry
		cache.withCache("key1", fetcher);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("uses per-resource key generators", () => {
		const cache = createCache({
			enabled: true,
			resourceKeyGenerators: {
				fireUpdates: (query, context) =>
					`fireUpdates-${context.parentQuery.id}`,
				assets: (query) => `asset-${query.id}`,
				organizations: () => "organizations",
			},
		});

		const fetcher = vi.fn().mockReturnValue("result");

		// Test fireUpdates resource-specific key
		cache.withCache({ type: "fireUpdates" }, fetcher, {
			context: { parentQuery: { id: "fire123" } },
		});

		// Test assets resource-specific key
		cache.withCache({ type: "assets", id: "asset456" }, fetcher, {
			context: {},
		});

		// Test organizations resource-specific key
		cache.withCache({ type: "organizations" }, fetcher, { context: {} });

		// Should have called fetcher 3 times for different cache keys
		expect(fetcher).toHaveBeenCalledTimes(3);

		// Test cache hits with same keys
		cache.withCache({ type: "fireUpdates" }, fetcher, {
			context: { parentQuery: { id: "fire123" } },
		});
		cache.withCache({ type: "assets", id: "asset456" }, fetcher, {
			context: {},
		});

		// Should still be 3 calls (cache hits)
		expect(fetcher).toHaveBeenCalledTimes(3);
	});

	it("falls back to default key generator for unmapped resources", () => {
		const defaultKeyGen = vi.fn().mockReturnValue("default-key");
		const cache = createCache({
			enabled: true,
			keyGenerator: defaultKeyGen,
			resourceKeyGenerators: {
				organizations: () => "org-key",
			},
		});

		const fetcher = vi.fn().mockReturnValue("result");

		// Use mapped resource - should use resource-specific generator
		cache.withCache({ type: "organizations" }, fetcher, { context: {} });
		expect(defaultKeyGen).not.toHaveBeenCalled();

		// Use unmapped resource - should fall back to default generator
		cache.withCache({ type: "unmappedResource" }, fetcher, { context: {} });
		expect(defaultKeyGen).toHaveBeenCalledWith(
			{ type: "unmappedResource" },
			{},
		);
	});

	it("supports manual caching mode", () => {
		const cache = createCache({
			enabled: true,
			manual: true,
		});

		expect(cache.config.manual).toBe(true);
	});
});
