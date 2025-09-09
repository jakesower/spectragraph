import {
	createGraphFromResources,
	linkInverses,
	mergeGraphsDeep,
} from "@data-prism/core";
import { compileResourceMappers } from "../helpers.js";

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * @param {import('@data-prism/core').NormalRootQuery} rootQuery - The query to execute.
 * @param {Object} storeContext - Context related to the state of the application, managed by StoreContext
 * @returns {import('@data-prism/core').Graph} - A graph with all the data necessary for the query to be executed loaded.
 */
export async function loadQueryGraph(rootQuery, storeContext) {
	const { schema } = storeContext;

	const step = async (query, queryContext) => {
		const context = { ...storeContext, ...queryContext };
		const { config } = context;
		const { specialHandlers = [] } = config;
		const { get, mappers } = config.resourceConfig[query.type];
		const mapFn = mappers
			? compileResourceMappers(schema, query.type, mappers)
			: (res) => res;

		const handler =
			specialHandlers.find((h) => h.test(query, context))?.handler ?? get;

			let queryPromise;
		try {
			// use an IIFE since some handlers could return non-promises
			queryPromise = (async () => {
				const fetched = await handler(query, context);
				const asArray = Array.isArray(fetched) ? fetched : [fetched];
				const mapped = asArray.map(mapFn);

				return createGraphFromResources(schema, query.type, mapped);
			})();
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
		const relatedGraphPromises = [];
		Object.keys(schema.resources[query.type].relationships).forEach(
			(relName) => {
				if (
					query.select[relName] &&
					!(typeof query.select[relName] === "string")
				) {
					relatedGraphPromises.push(
						step(query.select[relName], subqueryContext),
					);
				}
			},
		);

		const graphs = await Promise.all([queryPromise, ...relatedGraphPromises]);

		return graphs.reduce(mergeGraphsDeep);
	};

	const initialContext = { ...storeContext, parentQuery: null };
	const unlinked = await step(rootQuery, initialContext);

	return linkInverses(schema, unlinked);
}
