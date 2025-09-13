import { createGraphFromResources, mergeGraphsDeep } from "@spectragraph/core";

/**
 * Core query traversal engine with callback pattern - reusable across store types
 *
 * @param {import('@spectragraph/core').Schema} schema
 * @param {import('@spectragraph/core').NormalQuery} rootQuery
 * @param {(query: import('@spectragraph/core').Query, context: Object) => Promise<any>} executor
 * @param {Object} [initialContext={}] - Initial context passed to executor
 * @returns {Promise<any>} Result from executing the query tree
 */
export async function collectQueryResults(
	schema,
	rootQuery,
	executor,
	initialContext = {},
) {
	const step = async (query, stepContext) => {
		// Execute the main query
		const stepResult = await executor(query, stepContext);

		// Prepare context for subqueries
		const subqueryContext = { ...stepContext, parentQuery: query };

		// Process all relationships that have subqueries
		const subqueryPromises = Object.keys(
			schema.resources[query.type].relationships,
		)
			.filter((relName) => relName in query.select)
			.map((relName) => step(query.select[relName], subqueryContext));

		// Wait for all subqueries to complete
		const subqueryResults = await Promise.all(subqueryPromises);

		// Return main result and all subquery results
		return [stepResult, ...subqueryResults];
	};

	return step(rootQuery, initialContext);
}

/**
 * @typedef {Object} APIHandler
 * @property {(query: import('@spectragraph/core').Query, context: Object) => Promise<any>} get
 * @property {(resource: Object, context: Object) => Promise<any>} [create]
 * @property {(resource: Object, context: Object) => Promise<any>} [update]
 * @property {(resource: Object, context: Object) => Promise<any>} [delete]
 */

/**
 * @typedef {Object.<string, APIHandler>} APIRegistry
 */

/**
 * @typedef {Object} SpecialHandler
 * @property {(query: import('@spectragraph/core').Query, context: Object) => boolean} test
 * @property {(query: import('@spectragraph/core').Query, context: Object) => Promise<any>} handler
 */

/**
 * @typedef {Object} QueryExecutionOptions
 * @property {Object} [context] - Context passed to API handlers (store specific information, etc)
 * @property {SpecialHandler[]} [specialHandlers] - Array of special case handlers
 * @property {(key: string, fetcher: () => Promise<any>, options?: {ttl?: number}) => Promise<any>} [withCache] - Caching function
 */

/**
 * Replaces the entire loadQueryData pattern - handles traversal, API coordination, and graph building
 * @param {import('@spectragraph/core').Schema} schema
 * @param {import('@spectragraph/core').NormalQuery} normalizedQuery
 * @param {APIRegistry} apiRegistry - Maps resource types to API handlers
 * @param {QueryExecutionOptions} options - Context, caching, special handlers
 * @returns {Promise<import('@spectragraph/core').Graph>}
 */
export async function executeQueryWithAPIs(
	schema,
	rootQuery,
	apiRegistry,
	options = {},
) {
	const { context = {}, specialHandlers = [] } = options;

	const executor = async (query, stepContext) => {
		// Find special handler or use default API handler
		const specialHandler = specialHandlers.find((h) =>
			h.test(query, stepContext),
		);
		const handler = specialHandler?.handler ?? apiRegistry[query.type]?.get;

		if (!handler) {
			throw new Error(`No API handler found for resource type: ${query.type}`);
		}

		try {
			// Execute the handler and convert result to graph
			const fetched = await handler(query, stepContext);
			return createGraphFromResources(
				schema,
				query.type,
				fetched ? (Array.isArray(fetched) ? fetched : [fetched]) : [],
			);
		} catch (err) {
			const resourceType = query.type;

			if (err.response) {
				// HTTP error response (4xx, 5xx)
				const { status, data } = err.response;
				throw new Error(
					`Failed to load ${resourceType}: ${status} ${
						data?.message ?? err.message
					}`,
				);
			} else if (err.request) {
				// Network error (no response received)
				throw new Error(
					`Network error loading ${resourceType}: ${err.message}`,
				);
			} else {
				// Other error (request setup, etc.)
				throw new Error(`Error loading ${resourceType}: ${err.message}`);
			}
		}
	};

	const initialContext = { ...context, parentQuery: null };
	const results = await collectQueryResults(
		schema,
		rootQuery,
		executor,
		initialContext,
	);

	// Flatten and merge all graphs into one
	return results.reduce(mergeGraphsDeep);
}
