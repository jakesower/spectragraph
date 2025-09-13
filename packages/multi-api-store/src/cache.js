/**
 * Creates a simple TTL-based cache for multi-api-store
 * @param {Object} config - Cache configuration
 * @param {boolean} config.enabled - Whether caching is enabled
 * @param {boolean} config.manual - Whether manual caching is enabled globally
 * @param {number} config.defaultTTL - Default TTL in milliseconds
 * @param {function} config.keyGenerator - Function to generate cache keys
 * @param {Object} config.resourceKeyGenerators - Per-resource key generators
 * @returns {Object} Cache instance with withCache and clearByType methods
 */
export function createCache(config = {}) {
	const cache = new Map();
	const cacheConfig = {
		enabled: config.enabled ?? false,
		manual: config.manual ?? false,
		defaultTTL: config.defaultTTL ?? 5 * 60 * 1000, // 5 minutes default
		keyGenerator:
			config.keyGenerator ??
			((query, context) =>
				JSON.stringify({ query, parentQueryType: context.parentQuery?.type })),
		resourceKeyGenerators: config.resourceKeyGenerators ?? {},
		...config,
	};

	/**
	 * Cache wrapper that either returns cached value or executes fetcher
	 * @param {string|Object} keyOrQuery - Cache key string, or query object for auto-generation
	 * @param {function} fetcher - Function that returns the value to cache
	 * @param {Object} options - Options for this cache operation
	 * @param {number} options.ttl - TTL override for this operation
	 * @param {Object} options.context - Context for key generation (when keyOrQuery is a query)
	 * @param {boolean} options.forceRefresh - Whether to ensure the cache misses
	 * @returns {*} Cached or fetched value
	 */
	const withCache = (keyOrQuery, fetcher, options = {}) => {
		if (!cacheConfig.enabled) return fetcher();

		const { context = {} } = options;
		const { forceRefresh } = context;
		const keyGen =
			cacheConfig.resourceKeyGenerators[keyOrQuery.type] ??
			cacheConfig.keyGenerator;

		// Determine cache key
		const key =
			typeof keyOrQuery === "string" ? keyOrQuery : keyGen(keyOrQuery, context);

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
		cache.set(key, { value: fetched, expiry });

		return fetched;
	};

	/**
	 * Clear all cache entries for a specific resource type
	 * @param {string} type - Resource type to clear cache for
	 */
	const clearByType = (type) => {
		if (!cacheConfig.enabled) {
			return;
		}

		Array.from(cache.keys())
			.filter((key) => key.includes(`"type":"${type}"`))
			.forEach((key) => cache.delete(key));
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
		if (!cacheConfig.enabled) {
			return;
		}
		cache.delete(key);
	};

	return {
		withCache,
		clearByType,
		clear,
		clearKey,
		config: cacheConfig,
	};
}
