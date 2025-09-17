import {
	createGraphFromResources,
	linkInverses,
	mergeGraphsDeep,
} from "@spectragraph/core";
import {
	buildAsyncMiddlewarePipe,
	handleFetchResponse,
} from "./helpers/helpers.js";
import { defaultConfig } from "./default-config.js";
import { toMerged } from "es-toolkit";

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * @param {import('@spectragraph/core').NormalRootQuery} rootQuery - The query to execute.
 * @param {Object} storeContext - Context related to the state of the application, managed by StoreContext
 * @returns {import('@spectragraph/core').Graph} - A graph with all the data necessary for the query to be executed loaded.
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
				const response = await stepConfig.handlers.get.fetch(finishedCtx);
				const data = await handleFetchResponse(response);

				if (data === null || data === undefined) return {};

				const asArray = Array.isArray(data) ? data : [data];
				const mapped = asArray.map(stepConfig.handlers.get.map);
				return createGraphFromResources(schema, query.type, mapped);
			};

			if (stepConfig.cache.manual) return fetcher();

			const key = stepConfig.cache.generateKey(query, context);
			return withCache(key, fetcher, { context });
		};

		const pipe = buildAsyncMiddlewarePipe([...middleware, fetchWithCache]);
		const middlewareCtx = {
			schema,
			query,
			request: stepConfig.request,
			parentQuery: context.parentQuery,
			config: stepConfig,
			withCache,
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
