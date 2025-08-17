// TypeScript definitions for @data-prism/sqlite-store
// Generated from JSDoc annotations

import type { Schema, RootQuery } from "@data-prism/core";

/**
 * Store configuration for SQLite
 */
export interface SQLiteStoreConfig {
	resources: {
		[resourceType: string]: {
			table: string;
			idAttribute?: string;
			joins?: {
				[relationshipName: string]: {
					localColumn?: string;
					foreignTable?: string;
					foreignColumn?: string;
					joinTable?: string;
					localJoinColumn?: string;
					foreignJoinColumn?: string;
				};
			};
		};
	};
}

/**
 * SQLite store instance
 */
export interface SQLiteStore {
	/**
	 * Execute a query against the store
	 * @param query - The query to execute
	 * @returns Promise resolving to query result
	 */
	query(query: RootQuery): Promise<unknown>;
}

/**
 * Creates a new SQLite store instance
 * @param schema - The data schema
 * @param db - The SQLite database instance
 * @param config - Store configuration
 * @returns SQLite store instance
 */
export function createSQLiteStore(
	schema: Schema,
	db: unknown,
	config?: SQLiteStoreConfig,
): SQLiteStore;