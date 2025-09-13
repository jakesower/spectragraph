// TypeScript definitions for @spectragraph/query-helpers
// Generated from JSDoc annotations

import type { Schema, RootQuery, Query } from "@spectragraph/core";

// === QUERY BREAKDOWN TYPES ===

/**
 * A breakdown item representing a single level in a flattened query structure
 */
export interface QueryBreakdownItem {
	/** Path to this query level */
	path: string[];
	/** Selected attributes */
	attributes: any;
	/** Selected relationships */
	relationships: any;
	/** Resource type */
	type: string;
	/** The query object */
	query: Query;
	/** Parent breakdown item if any */
	parent: QueryBreakdownItem | null;
	/** Parent query if any */
	parentQuery: Query | null;
	/** Parent relationship name if any */
	parentRelationship: string | null;
}

/**
 * Array of query breakdown items representing a flattened query structure
 */
export type QueryBreakdown = QueryBreakdownItem[];

// === QUERY TRAVERSAL FUNCTIONS ===

/**
 * Flattens a nested query into a linear array of query breakdown items
 * @param schema - The schema defining relationships
 * @param rootQuery - The root query to flatten
 * @returns Flattened query breakdown
 */
export function flattenQuery(schema: Schema, rootQuery: RootQuery): QueryBreakdown;

/**
 * Maps over each query in a flattened query structure
 * @param schema - The schema defining relationships
 * @param query - The root query
 * @param fn - Mapping function
 * @returns Mapped results
 */
export function flatMapQuery<T>(
	schema: Schema,
	query: RootQuery,
	fn: (query: Query, info: QueryBreakdownItem) => T
): T[];

/**
 * Iterates over each query in a flattened query structure
 * @param schema - The schema defining relationships
 * @param query - The root query
 * @param fn - Iteration function
 */
export function forEachQuery(
	schema: Schema,
	query: RootQuery,
	fn: (query: Query, info: QueryBreakdownItem) => void
): void;

/**
 * Tests whether some query in a flattened query structure matches a condition
 * @param schema - The schema defining relationships
 * @param query - The root query
 * @param fn - Test function
 * @returns Whether any query matches the condition
 */
export function someQuery(
	schema: Schema,
	query: RootQuery,
	fn: (query: Query, info: QueryBreakdownItem) => boolean
): boolean;