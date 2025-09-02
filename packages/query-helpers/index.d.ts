// TypeScript definitions for @data-prism/query-helpers
// Generated from JSDoc annotations

import type { Schema, RootQuery, Query, NormalQuery, Graph } from "@data-prism/core";

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

// === MULTI-API TYPES ===

/**
 * API handler for a specific resource type
 */
export interface APIHandler {
	/** Handler for query operations */
	get: (query: Query, context: Object) => Promise<any>;
	/** Optional handler for create operations */
	create?: (resource: Object, context: Object) => Promise<any>;
	/** Optional handler for update operations */
	update?: (resource: Object, context: Object) => Promise<any>;
	/** Optional handler for delete operations */
	delete?: (resource: Object, context: Object) => Promise<any>;
}

/**
 * Registry mapping resource types to their API handlers
 */
export type APIRegistry = {
	[resourceType: string]: APIHandler;
};

/**
 * Special handler for custom query processing logic
 */
export interface SpecialHandler {
	/** Test function to determine if this handler should be used */
	test: (query: Query, context: Object) => boolean;
	/** Handler function for custom processing */
	handler: (query: Query, context: Object) => Promise<any>;
}

/**
 * Options for query execution with multiple APIs
 */
export interface QueryExecutionOptions {
	/** Context passed to API handlers (store specific information, etc) */
	context?: Object;
	/** Array of special case handlers */
	specialHandlers?: SpecialHandler[];
	/** Caching function */
	withCache?: (key: string, fetcher: () => Promise<any>, options?: {ttl?: number}) => Promise<any>;
}

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

// === QUERY FORMATTER TYPES ===

/**
 * Structured query parameters extracted from a Data Prism query
 */
export interface QueryParameters {
	/** Fields to select by resource type */
	fields: { [resourceType: string]: string[] };
	/** Relationship paths to include */
	includes: string[];
	/** Sort parameters */
	sort: Array<{ field: string; direction: "asc" | "desc" }>;
	/** Pagination parameters */
	pagination: {
		limit?: number;
		offset?: number;
	};
	/** Filter conditions by field path */
	filters: { [fieldPath: string]: any };
}

/**
 * Parameter formatter interface for different API styles
 */
export interface ParameterFormatter {
	/** Format field selections */
	formatFields: (fields: { [resourceType: string]: string[] }) => string;
	/** Format relationship includes */
	formatIncludes: (includes: string[]) => string;
	/** Format sort parameters */
	formatSort: (sort: Array<{ field: string; direction: "asc" | "desc" }>) => string;
	/** Format pagination */
	formatPagination: (pagination: { limit?: number; offset?: number }) => string;
	/** Format filter conditions */
	formatFilters: (filters: { [fieldPath: string]: any }) => string;
	/** Format the base path */
	formatPath: (baseURL: string, resourceType: string, resourceId?: string) => string;
	/** Combine all parameters into query string */
	combineParameters: (params: string[]) => string;
}

// === QUERY FORMATTER FUNCTIONS ===

/**
 * Extracts structured parameters from a Data Prism query
 * @param schema - The schema defining relationships
 * @param query - The query to analyze
 * @returns Structured query parameters
 */
export function extractQueryParameters(schema: Schema, query: RootQuery): QueryParameters;

/**
 * Builds a complete query URL using a parameter formatter
 * @param schema - The schema defining relationships
 * @param query - The query to format
 * @param baseURL - Base URL for the API
 * @param formatter - Parameter formatting strategy
 * @returns Complete formatted URL
 */
export function buildQueryURL(
	schema: Schema,
	query: RootQuery,
	baseURL: string,
	formatter: ParameterFormatter
): string;

// === BUILT-IN FORMATTERS ===

/**
 * JSON:API specification compliant formatter
 */
export const jsonApiFormatter: ParameterFormatter;

/**
 * Simple REST API formatter (common query parameter patterns)
 */
export const restApiFormatter: ParameterFormatter;

/**
 * OData-style formatter
 */
export const oDataFormatter: ParameterFormatter;

// === MULTI-API FUNCTIONS ===

/**
 * Core query traversal engine with callback pattern - reusable across store types
 * @param schema - The schema defining relationships
 * @param rootQuery - The normalized query to execute
 * @param executor - Async function to execute each query level
 * @param initialContext - Initial context passed to executor
 * @returns Result from executing the query tree
 */
export function collectQueryResults(
	schema: Schema,
	rootQuery: NormalQuery,
	executor: (query: Query, context: Object) => Promise<any>,
	initialContext?: Object
): Promise<any>;

/**
 * Replaces the entire loadQueryData pattern - handles traversal, API coordination, and graph building
 * @param schema - The schema defining relationships
 * @param rootQuery - The normalized query to execute
 * @param apiRegistry - Maps resource types to API handlers
 * @param options - Context, caching, special handlers
 * @returns Complete graph with all query results merged
 */
export function executeQueryWithAPIs(
	schema: Schema,
	rootQuery: NormalQuery,
	apiRegistry: APIRegistry,
	options?: QueryExecutionOptions
): Promise<Graph>;