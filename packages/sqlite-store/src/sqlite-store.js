import { get as getQuery } from "./helpers/get.js";

export function createSQLiteStore(schema, db, userConfig = {}) {
	const fullStoreConfig = {
		...userConfig,
	};

	return {
		get: async (query) => {
			return getQuery(query, {
				config: fullStoreConfig,
				db,
				schema,
				query,
			});
		},
	};
}
