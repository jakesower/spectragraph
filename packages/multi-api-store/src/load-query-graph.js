import {
	createGraphFromResources,
	linkInverses,
	mergeGraphsDeep,
} from "@data-prism/core";
import {
	buildAsyncMiddlewarePipe,
	compileResourceMappers,
} from "./helpers/helpers.js";
import { standardHandler } from "./standard-handler.js";

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * @param {import('@data-prism/core').NormalRootQuery} rootQuery - The query to execute.
 * @param {Object} storeContext - Context related to the state of the application, managed by StoreContext
 * @returns {import('@data-prism/core').Graph} - A graph with all the data necessary for the query to be executed loaded.
 */
export async function loadQueryGraph(rootQuery, storeContext) {
	const {
		middleware = [],
		schema,
		specialHandlers = [],
		withCache,
	} = storeContext;

	const step = async (query, queryContext) => {
		const context = { ...storeContext, ...queryContext };
		const { config = {} } = context;
		const resourceConfig = config.resources[query.type] ?? {};
		const { get, mappers } = resourceConfig;

		const mapFn = mappers
			? compileResourceMappers(schema, query.type, mappers)
			: (res) => res;

		// Check for special handlers first
		const specialHandler = specialHandlers.find((h) => h.test(query, context));
		const handler = specialHandler?.handler ?? get ?? standardHandler.get;

		// Determine if this resource uses manual caching
		const isManuallyCaching =
			specialHandler?.cache?.manual ||
			(resourceConfig.cache?.manual ?? storeContext.manualCaching);

		const fetchWithCache = async (ctx) => {
			const fetcher = async () => {
				const fetched = await handler(ctx);
				const asArray = Array.isArray(fetched) ? fetched : [fetched];
				const mapped = asArray.map(mapFn);
				return createGraphFromResources(schema, query.type, mapped);
			};

			return isManuallyCaching
				? fetcher()
				: withCache(query, fetcher, { context });
		};

		const initRequest = {
			baseURL: resourceConfig.baseURL ?? storeContext.baseURL ?? "",
			headers: {},
			queryParams: [],
			...context,
			query,
		};

		const pipe = buildAsyncMiddlewarePipe([...middleware, fetchWithCache]);

		let queryPromise;
		try {
			queryPromise = pipe({ ...context, query, request: initRequest });
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

		const subqueryContext = { ...context, parentQuery: query };
		const relatedGraphPromises = Object.keys(
			schema.resources[query.type].relationships,
		)
			.filter((relName) => query.select[relName])
			.map((relName) => step(query.select[relName], subqueryContext));

		const graphs = await Promise.all([queryPromise, ...relatedGraphPromises]);
		return graphs.reduce(mergeGraphsDeep);
	};

	const initialContext = { ...storeContext, parentQuery: null };
	const unlinked = await step(rootQuery, initialContext);

	return linkInverses(schema, unlinked);
}
