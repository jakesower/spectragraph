import { get as getQuery } from "./get.js";

export function createSQLiteStore(schema, db, config = {}) {
	const fullStoreConfig = {
		...config,
	};

	return {
		get: async (query) =>
			getQuery(query, {
				config: fullStoreConfig,
				db,
				schema,
				query,
			}),
	};
}
