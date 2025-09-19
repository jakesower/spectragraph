import {
	createGraphFromResources,
	linkInverses,
	mergeGraphsDeep,
} from "@spectragraph/core";
import { toMerged } from "es-toolkit";
import {
	buildAsyncMiddlewarePipe,
	handleFetchResponse,
} from "./helpers/helpers.js";
import { defaultConfig, standardHandlers } from "./default-config.js";

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * Executes handlers through middleware pipeline, applies caching, and builds a complete data graph.
 *
 * @param {import('@spectragraph/core').NormalRootQuery} rootQuery - The normalized query to execute
 * @param {Object} storeContext - Store context containing configuration and handlers
 * @param {Object} storeContext.config - Store configuration including resources and middleware
 * @param {import('@spectragraph/core').Schema} storeContext.schema - Schema defining resource types and relationships
 * @param {Array} storeContext.middleware - Middleware functions to apply to requests
 * @param {Array} storeContext.specialHandlers - Special handlers that override resource handlers
 * @param {Function} storeContext.withCache - Cache wrapper function
 * @returns {Promise<import('@spectragraph/core').Graph>} Graph with all data necessary for query execution
 */
export async function loadQueryGraph(rootQuery, storeContext) {
	const { config, schema, middleware, specialHandlers, withCache } =
		storeContext;

	const step = async (query, queryContext) => {
		const context = { ...storeContext, ...queryContext };

		// Check for special handlers first
		const specialHandler = specialHandlers.find((h) => h.test(query, context));

		// Build out the context relevant to this step (rightmost args take priority)
		const stepConfig = [
			defaultConfig,
			config,
			context.resources[query.type] ?? {},
			specialHandler ?? {},
		].reduce(toMerged);

		const fetchWithCache = async (ctx) => {
			const finishedCtx = {
				...ctx,
				request: {
					...ctx.request,
					queryParamsStr: stepConfig.stringifyQueryParams(
						ctx.request.queryParams,
					),
				},
			};

			const fetcher = async () => {
				// Use special handler if available, otherwise use regular handler
				const handler =
					specialHandler?.handler ??
					stepConfig.query?.fetch ??
					stepConfig.query ??
					standardHandlers.query;
				const response = await handler(finishedCtx);
				const data = await handleFetchResponse(response);

				const asArray =
					data === null || data === undefined
						? []
						: Array.isArray(data)
							? data
							: [data];
				const mapper = stepConfig.query?.map;
				const mapped = mapper
					? asArray.map((resource) => mapper(resource, finishedCtx))
					: asArray;
				return createGraphFromResources(schema, query.type, mapped);
			};

			if (stepConfig.cache.manual) return fetcher();

			const key = stepConfig.cache.generateKey(query, context);
			return withCache(key, fetcher, { config: stepConfig, context, query });
		};

		const pipe = buildAsyncMiddlewarePipe([...middleware, fetchWithCache]);
		const middlewareCtx = {
			...context, // Include all context properties like organizationIds
			schema,
			query,
			request: stepConfig.request,
			parentQuery: context.parentQuery,
			config: stepConfig,
			withCache: (key, fetcher, options = {}) =>
				withCache(key, fetcher, {
					config: stepConfig,
					context: options.context,
					query,
					...options,
				}),
		};
		const queryPromise = pipe(middlewareCtx);

		const subqueryContext = { ...context, parentQuery: query };
		const relatedGraphPromises = Object.keys(
			schema.resources[query.type].relationships,
		)
			.filter((relName) => query.select[relName])
			.map((relName) => step(query.select[relName], subqueryContext));

		// intentionally do not catch -- errors from inside here are already high quality
		const graphs = await Promise.all([queryPromise, ...relatedGraphPromises]);
		return graphs.reduce(mergeGraphsDeep);
	};

	const initialContext = { ...storeContext, parentQuery: null };
	const unlinked = await step(rootQuery, initialContext);

	return linkInverses(schema, unlinked);
}
