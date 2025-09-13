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

const queryParamsToStr = (queryParams) =>
	queryParams && queryParams.length > 0
		? `?${queryParams.map((obj) =>
				Object.entries(obj)
					.map(([k, v]) => `${k}=${v}`)
					.join("&"),
			)}`
		: "";

/**
 * Loads all the data needed for a query to run, including its subqueries.
 * @param {import('@data-prism/core').NormalRootQuery} rootQuery - The query to execute.
 * @param {Object} storeContext - Context related to the state of the application, managed by StoreContext
 * @returns {import('@data-prism/core').Graph} - A graph with all the data necessary for the query to be executed loaded.
 */
export async function loadQueryGraph(rootQuery, storeContext) {
	const {
		config: { middleware = [] },
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

		// Determine if this resource uses manual caching or should force refresh
		const isManuallyCaching =
			specialHandler?.cache?.manual ||
			(resourceConfig.cache?.manual ?? storeContext.manualCaching);

		const fetchWithCache = async (ctx) => {
			const finishedCtx = {
				...ctx,
				request: {
					...ctx.request,
					queryParamsStr: queryParamsToStr(ctx.request.queryParams),
				},
			};

			const fetcher = async () => {
				const response = await handler(finishedCtx);

				// Handle Response objects (from standard handler)
				if (response && typeof response.ok === "boolean") {
					if (!response.ok) {
						const errorData = await response.json().catch(() => ({
							message: response.statusText,
						}));
						throw new Error(errorData.message || `HTTP ${response.status}`, {
							cause: { data: errorData, response },
						});
					}
					const data = await response.json();
					if (data === null || data === undefined) {
						return createGraphFromResources(schema, query.type, []);
					}
					const asArray = Array.isArray(data) ? data : [data];
					const mapped = asArray.map(mapFn);
					return createGraphFromResources(schema, query.type, mapped);
				}

				// Handle direct data (from custom handlers)
				if (response === null || response === undefined) {
					return createGraphFromResources(schema, query.type, []);
				}

				const asArray = Array.isArray(response) ? response : [response];
				const mapped = asArray.map(mapFn);
				return createGraphFromResources(schema, query.type, mapped);
			};

			if (isManuallyCaching) return fetcher();

			return withCache(query, fetcher, { context });
		};

		const initRequest = {
			baseURL: resourceConfig.baseURL ?? storeContext.baseURL ?? "",
			request: {
				headers: { Accept: "application/json" },
				queryParams: [],
			},
			...context,
			query,
		};

		const pipe = buildAsyncMiddlewarePipe([...middleware, fetchWithCache]);

		const queryPromise = pipe(initRequest);

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
