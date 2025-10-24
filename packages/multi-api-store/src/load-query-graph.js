import {
	createGraphFromResources,
	linkInverses,
	mergeGraphsDeep,
} from "@spectragraph/core";
import { mapValues, toMerged } from "es-toolkit";
import {
	buildAsyncMiddlewarePipe,
	handleResponseData,
} from "./helpers/helpers.js";
import { defaultConfig } from "./default-config.js";

/**
 * @typedef {Object} MiddlewareContext
 * @property {import('@spectragraph/core').Schema} schema - Schema defining resource types and relationships
 * @property {import('@spectragraph/core').NormalRootQuery} query - The current query being processed
 * @property {import('./default-config.js').RequestConfig} request - Request configuration for this step
 * @property {import('@spectragraph/core').NormalQuery|null} parentQuery - Parent query in the hierarchy
 * @property {import('./default-config.js').FullConfig} config - Full merged configuration for this step
 * @property {Function} step - The step function to walk a query and its subqueries
 * @property {Function} withCache - Cache wrapper function with pre-bound config and query
 */

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * Executes handlers through middleware pipeline, applies caching, and builds a complete data graph.
 *
 * @param {import('@spectragraph/core').NormalRootQuery} rootQuery - The normalized query to execute
 * @param {import('./multi-api-store.js').StoreContext} storeContext - Store context containing configuration and handlers
 * @returns {Promise<import('@spectragraph/core').Graph>} - Graph with all data necessary for query execution
 */
export async function loadQueryGraph(rootQuery, storeContext) {
	const { config, schema, withCache } = storeContext;
	const baseConfig = toMerged(defaultConfig, config);

	/**
	 *
	 * @param {import('@spectragraph/core').Query} query
	 * @param {import('./default-config.js').Config} context
	 * @returns {import('./default-config.js').FullConfig}
	 */
	const buildConfig = (query, context) => {
		const specialHandler = config.specialHandlers.find((h) =>
			h.test(query, context),
		);

		// Build out the context relevant to this step (rightmost args take priority)
		/** @type {import('./default-config.js').FullConfig} */
		return [
			baseConfig,
			context.config.resources[query.type] ?? {},
			specialHandler ?? {},
		].reduce(toMerged);
	};

	const step = async (query, queryContext) => {
		const context = { ...storeContext, ...queryContext };
		const stepConfig = buildConfig(query, context);

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

			// // IN: flatResources, child outputs by relationship
			// // OUT: { graph, unhandledQuery }
			// const finalize = (resources, related = {}) => {
			// 	const map = stepConfig.query?.map;
			// 	const mapped = Array.isArray(resources)
			// 		? map
			// 			? resources.map(map)
			// 			: resources
			// 		: [map ? map(resources) : resources];

			// 	const baseGraph = createGraphFromResources(schema, query.type, mapped);
			// 	const graph = Object.values(related).reduce(
			// 		(acc, r) => mergeGraphsDeep(acc, r.graph),
			// 		baseGraph,
			// 	);

			// 	const select = {
			// 		...query.select,
			// 		...mapValues(related, (r) => r.unhandledQuery),
			// 	};

			// 	const handles = stepConfig.query?.handles ?? {};
			// 	const unhandledQuery = {
			// 		type: query.type,
			// 		select,
			// 		...(!handles.where && query.where ? { where: query.where } : {}),
			// 		...(!handles.limit && query.limit ? { limit: query.limit } : {}),
			// 		...(!handles.offset && query.offset ? { offset: query.offset } : {}),
			// 		...(!handles.order && query.order ? { order: query.order } : {}),
			// 	};

			// 	return { graph, unhandledQuery };
			// };

			const fetcher = async () => {
				// Use special handler if available, otherwise use regular handler
				const response = await stepConfig.query.fetch(finishedCtx);
				const data = await handleResponseData(response);

				const asArray =
					data === null || data === undefined
						? []
						: Array.isArray(data)
							? data
							: [data];
				const mapper = stepConfig.query?.map;
				return mapper
					? asArray.map((resource) => mapper(resource, finishedCtx))
					: asArray;
			};

			if (stepConfig.cache.manual) return fetcher();

			const key = stepConfig.cache.generateKey(query, context);
			return withCache(key, fetcher, { config: stepConfig, context, query });
		};

		const pipe = buildAsyncMiddlewarePipe([
			...stepConfig.middleware,
			fetchWithCache,
		]);

		/** @type {MiddlewareContext} */
		const middlewareCtx = {
			...context,
			step,
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

		const queryTreePromise = pipe(middlewareCtx);
		const queryGraphPromise = queryTreePromise.then((tree) =>
			createGraphFromResources(schema, query.type, tree),
		);

		const subqueryContext = {
			parentQuery: query,
			parentResultPromise: queryTreePromise,
		};

		const relatedGraphPromises = Object.keys(
			schema.resources[query.type].relationships,
		)
			.filter((relName) => query.select[relName])
			.filter((relName) => !stepConfig.query?.handles?.relationships?.[relName])
			.map((relName) => step(query.select[relName], subqueryContext));

		// intentionally do not catch -- errors from inside here are already high quality
		const graphs = await Promise.all([
			queryGraphPromise,
			...relatedGraphPromises,
		]);
		return graphs.reduce(mergeGraphsDeep);
	};

	const initialContext = { ...storeContext, parentQuery: null };
	const unlinked = await step(rootQuery, initialContext);

	return linkInverses(schema, unlinked);
}
