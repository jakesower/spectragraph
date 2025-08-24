import { get as getQuery } from "./get.js";

/**
 * @typedef {import('@data-prism/core').Store} SQLiteStore
 */

/**
 * Creates a new SQLite store instance that implements the data-prism store interface.
 * Currently only supports read operations (query).
 *
 * @param {import('@data-prism/core').Schema} schema - The schema defining resource types and relationships
 * @param {Database} db - The SQLite database instance
 * @param {Object} [config={}] - Configuration options for the store
 * @returns {SQLiteStore} A new SQLite store instance
 */
export function createSQLiteStore(schema, db, config = {}) {
	const fullStoreConfig = {
		...config,
		db,
	};

	return {
		async create(resource) {
			throw new Error("SQLite store does not yet support create operations");
		},
		async update(resource) {
			throw new Error("SQLite store does not yet support update operations");
		},
		async upsert(resource) {
			throw new Error("SQLite store does not yet support upsert operations");
		},
		async delete(resource) {
			throw new Error("SQLite store does not yet support delete operations");
		},
		async query(query) {
			return getQuery(query, {
				config: fullStoreConfig,
				schema,
				query,
			});
		},
	};
}
