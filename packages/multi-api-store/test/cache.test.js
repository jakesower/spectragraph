import { expect, it, describe, vi } from "vitest";
import { createCache } from "../src/cache.js";

describe("createCache", () => {
	const mockConfig = {
		cache: {
			enabled: true,
			ttl: 5 * 60 * 1000,
			generateKey: (query) => `${query.type}-${query.id ?? ""}`,
			dependsOnTypes: (query) => [query.type],
		},
	};

	const disabledConfig = {
		cache: { ...mockConfig.cache, enabled: false },
	};

	it("creates cache instance", () => {
		const cache = createCache();

		expect(typeof cache.withCache).toBe("function");
		expect(typeof cache.clearByType).toBe("function");
		expect(typeof cache.clear).toBe("function");
		expect(typeof cache.clearKey).toBe("function");
	});

	it("bypasses cache when disabled", () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");

		const result1 = cache.withCache("key1", fetcher, {
			config: disabledConfig,
		});
		const result2 = cache.withCache("key1", fetcher, {
			config: disabledConfig,
		});

		expect(result1).toBe("result");
		expect(result2).toBe("result");
		expect(fetcher).toHaveBeenCalledTimes(2); // Called twice, not cached
	});

	it("caches results when enabled", () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");

		const result1 = cache.withCache("key1", fetcher, { config: mockConfig });
		const result2 = cache.withCache("key1", fetcher, { config: mockConfig });

		expect(result1).toBe("result");
		expect(result2).toBe("result");
		expect(fetcher).toHaveBeenCalledTimes(1); // Called once, second was cached
	});

	it("clears cache by type using dependsOnTypes function", () => {
		const cache = createCache();
		const fetcher1 = vi.fn().mockReturnValue("result1");
		const fetcher2 = vi.fn().mockReturnValue("result2");

		const usersQuery = { type: "users", id: "1" };
		const postsQuery = { type: "posts", id: "1" };

		// Cache some results with different types
		cache.withCache("users-key", fetcher1, {
			config: mockConfig,
			query: usersQuery,
		});
		cache.withCache("posts-key", fetcher2, {
			config: mockConfig,
			query: postsQuery,
		});

		// Clear only users cache
		cache.clearByType("users", mockConfig);

		// Users cache should be cleared, posts should remain
		cache.withCache("users-key", fetcher1, {
			config: mockConfig,
			query: usersQuery,
		});
		cache.withCache("posts-key", fetcher2, {
			config: mockConfig,
			query: postsQuery,
		});

		expect(fetcher1).toHaveBeenCalledTimes(2); // Called again after clear
		expect(fetcher2).toHaveBeenCalledTimes(1); // Still cached
	});

	it("clears all cache", () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");

		cache.withCache("key1", fetcher, { config: mockConfig });
		cache.withCache("key2", fetcher, { config: mockConfig });

		// Verify cache has entries by testing behavior
		cache.withCache("key1", fetcher, { config: mockConfig });
		cache.withCache("key2", fetcher, { config: mockConfig });
		expect(fetcher).toHaveBeenCalledTimes(2); // Still 2 calls, cached

		cache.clear();

		// After clear, should fetch again
		cache.withCache("key1", fetcher, { config: mockConfig });
		expect(fetcher).toHaveBeenCalledTimes(3); // New fetch after clear
	});

	it("respects TTL and expires cached entries", async () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");
		const shortTTLConfig = {
			cache: { ...mockConfig.cache, ttl: 10 }, // 10ms TTL
		};

		cache.withCache("key1", fetcher, { config: shortTTLConfig });
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Should use cache immediately
		cache.withCache("key1", fetcher, { config: shortTTLConfig });
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Wait for TTL to expire
		await new Promise((resolve) => setTimeout(resolve, 15));

		// Should call fetcher again after expiry
		cache.withCache("key1", fetcher, { config: shortTTLConfig });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("supports forceRefresh option", () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");

		// Cache initial result
		cache.withCache("key1", fetcher, { config: mockConfig });
		expect(fetcher).toHaveBeenCalledTimes(1);

		// Normal call should use cache
		cache.withCache("key1", fetcher, { config: mockConfig });
		expect(fetcher).toHaveBeenCalledTimes(1);

		// forceRefresh should bypass cache
		cache.withCache("key1", fetcher, {
			config: mockConfig,
			context: { forceRefresh: true },
		});
		expect(fetcher).toHaveBeenCalledTimes(2); // Fresh fetch
	});

	it("clears specific cache entry with clearKey", () => {
		const cache = createCache();
		const fetcher1 = vi.fn().mockReturnValue("result1");
		const fetcher2 = vi.fn().mockReturnValue("result2");

		// Cache some results
		cache.withCache("key1", fetcher1, { config: mockConfig });
		cache.withCache("key2", fetcher2, { config: mockConfig });

		// Verify both are cached
		cache.withCache("key1", fetcher1, { config: mockConfig });
		cache.withCache("key2", fetcher2, { config: mockConfig });
		expect(fetcher1).toHaveBeenCalledTimes(1);
		expect(fetcher2).toHaveBeenCalledTimes(1);

		// Clear only key1
		cache.clearKey("key1");

		// key1 should require fresh fetch, key2 should still be cached
		cache.withCache("key1", fetcher1, { config: mockConfig });
		cache.withCache("key2", fetcher2, { config: mockConfig });
		expect(fetcher1).toHaveBeenCalledTimes(2); // Called again after clear
		expect(fetcher2).toHaveBeenCalledTimes(1); // Still cached
	});

	it("clearKey does nothing when cache is disabled", () => {
		const cache = createCache();
		const fetcher = vi.fn().mockReturnValue("result");

		// clearKey should not throw when cache is disabled
		expect(() => cache.clearKey("key1")).not.toThrow();

		// Verify cache is still disabled
		cache.withCache("key1", fetcher, { config: disabledConfig });
		cache.withCache("key1", fetcher, { config: disabledConfig });
		expect(fetcher).toHaveBeenCalledTimes(2); // No caching
	});

	it("clears rejected promises from cache", async () => {
		const cache = createCache();
		const successFetcher = vi.fn().mockResolvedValue("success");
		const failFetcher = vi.fn().mockRejectedValue(new Error("fail"));

		// Cache a successful promise first
		cache.withCache("success-key", successFetcher, { config: mockConfig });

		// Cache a failing promise
		const failPromise = cache.withCache("fail-key", failFetcher, {
			config: mockConfig,
		});

		// Wait for the failure
		await expect(failPromise).rejects.toThrow("fail");

		// Successful promise should still be cached
		cache.withCache("success-key", successFetcher, { config: mockConfig });
		expect(successFetcher).toHaveBeenCalledTimes(1);

		// Failed promise should be cleared and refetched
		cache.withCache("fail-key", failFetcher, { config: mockConfig });
		expect(failFetcher).toHaveBeenCalledTimes(2);
	});
});
