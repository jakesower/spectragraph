/**
 * Creates a simple TTL-based cache for multi-api-store with relationship-aware invalidation.
 * Provides cache wrapper functions and type-based clearing for cache invalidation.
 *
 * @returns {Object} Cache instance
 * @returns {Function} returns.withCache - Cache wrapper function that caches results of async operations
 * @returns {Function} returns.clearByType - Clears cache entries based on resource type dependencies
 * @returns {Function} returns.clear - Clears all cache entries
 * @returns {Function} returns.clearKey - Clears a specific cache entry by key
 */
export function createCache() {
	const cache = new Map();

	/**
	 * Cache wrapper that either returns cached value or executes fetcher
	 * @param {string} key - Cache key
	 * @param {function} fetcher - Function that returns the value to cache
	 * @param {Object} options - Options for this cache operation
	 * @param {Object} options.config - Store config containing cache settings
	 * @param {number} [options.ttl] - TTL override for this operation
	 * @param {Object} [options.context] - Context containing forceRefresh flag
	 * @param {Object} [options.query] - Original query for dependency tracking
	 * @returns {*} Cached or fetched value
	 */
	const withCache = (key, fetcher, options) => {
		const cacheConfig = options.config.cache;
		if (!cacheConfig.enabled) return fetcher();

		const { context = {} } = options;
		const { forceRefresh } = context;

		const now = Date.now();
		const cached = cache.get(key);

		// If cached and not expired and we're not forcing a refresh, return it
		if (!forceRefresh && cached && (!cached.expiry || cached.expiry > now)) {
			return cached.value;
		}

		// Otherwise, fetch and cache
		const fetched = fetcher();
		const expiry = options.ttl
			? now + options.ttl
			: cacheConfig.defaultTTL
				? now + cacheConfig.defaultTTL
				: undefined;

		// Store query for dependency tracking
		const originalQuery = options.query;
		cache.set(key, { value: fetched, expiry, originalQuery });

		// If the fetched value is a promise, handle rejections by clearing from cache
		if (fetched && typeof fetched.then === "function") {
			fetched.catch(() => {
				cache.delete(key);
			});
		}

		return fetched;
	};

	/**
	 * Clear all cache entries for a specific resource type
	 * @param {string} type - Resource type to clear cache for
	 * @param {Object} config - Store config containing dependsOnTypes function
	 * @param {Object} options - Additional options like schema
	 */
	const clearByType = (type, config, options = {}) => {
		const cacheConfig = config.cache;
		Array.from(cache.entries())
			.filter(([, entry]) => {
				if (!entry.originalQuery) return false;
				try {
					const dependencies = cacheConfig.dependsOnTypes(
						entry.originalQuery,
						options,
					);
					return Array.isArray(dependencies) && dependencies.includes(type);
				} catch {
					// If dependsOnTypes throws, skip this entry
					return false;
				}
			})
			.forEach(([key]) => cache.delete(key));
	};

	/**
	 * Clear all cache entries
	 */
	const clear = () => {
		cache.clear();
	};

	/**
	 * Clear a specific cache entry by key
	 * @param {string} key - Cache key to clear
	 */
	const clearKey = (key) => {
		cache.delete(key);
	};

	return {
		withCache,
		clearByType,
		clear,
		clearKey,
	};
}
