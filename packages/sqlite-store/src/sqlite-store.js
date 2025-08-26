import { get as getQuery } from "./get.js";

/**
 * @typedef {import('@data-prism/core').Store} SQLiteStore
 */

/**
 * @typedef {Object} SQLiteStoreConfig
 * @property {Object.<string, SQLiteResourceConfig>} resources
 */

/**
 * @typedef {Object} SQLiteResourceConfig
 * @property {string} table - Name of the database table for this resource type.
 * @property {string} [idAttribute] - Optional column name to use as the unique identifier.
 * @property {Object.<string, SQLiteJoinConfig>} [joins] - Optional relationship definitions keyed by relationship name.
 */

/**
 * @typedef {Object} SQLiteJoinConfig
 * @property {string} [localColumn] - Column in the local table used in the join.
 * @property {string} [foreignTable] - Name of the foreign table.
 * @property {string} [foreignColumn] - Column in the foreign table used in the join.
 * @property {string} [joinTable] - Name of the join table (for many-to-many relationships).
 * @property {string} [localJoinColumn] - Column in the join table that references the local table.
 * @property {string} [foreignJoinColumn] - Column in the join table that references the foreign table.
 */

/**
 * @typedef Context
 * @property {SQLiteStoreConfig} config
 * @property {Database} db
 * @property {import('@data-prism/core').Schema} schema
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
	const context = { config: { ...config, db }, db, schema };

	return {
		async create(resource) {
			return this.create(resource, { db, schema });
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
				...context,
				// query,
			});
		},
	};
}
