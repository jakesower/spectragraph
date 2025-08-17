import { get as getQuery } from "./get.js";

export function createSQLiteStore(schema, db, config = {}) {
	const fullStoreConfig = {
		...config,
		db,
	};

	return {
		query: async (query) =>
			getQuery(query, {
				config: fullStoreConfig,
				schema,
				query,
			}),
	};
}
