import { normalizeQuery, queryGraph } from "@data-prism/core";
import { loadQueryGraph } from "./rest-store-helpers/load-query-graph.js";

export function createRestStore(schema, config) {
	const { baseURL, resources: resourceConfig = {} } = config;
	const storeContext = { schema, config };

	const runQuery = async (rootQuery, options = {}, queryContext = {}) => {
		const normalQuery = normalizeQuery(schema, rootQuery);
		const graph = await loadQueryGraph(normalQuery, {
			...storeContext,
			...queryContext,
		});

		return queryGraph(schema, rootQuery, graph);
	};

	return {
		query: runQuery,
	};
}
