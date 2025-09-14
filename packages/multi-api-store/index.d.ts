// TypeScript definitions for @spectragraph/multi-api-store
// Generated from JSDoc annotations

import type { 
  Schema, 
  RootQuery,
  QueryResult,
  SelectExpressionEngine,
  WhereExpressionEngine
} from "@spectragraph/core";

export interface ApiResourceConfig {
  get(query?: { [key: string]: unknown }, context?: { [key: string]: unknown }): Promise<{ [key: string]: unknown }[]>;
  create?(resource: { [key: string]: unknown }, context?: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  update?(resource: { [key: string]: unknown }, context?: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  delete?(resource: { [key: string]: unknown }, context?: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  mappers?: {
    fromApi?: { [field: string]: string | ((resource: any) => any) };
    toApi?: { [field: string]: string | ((resource: any) => any) };
  };
}

export interface SpecialHandler {
  test(query: { [key: string]: unknown }, context?: { [key: string]: unknown }): boolean;
  handler(query: { [key: string]: unknown }, context?: { [key: string]: unknown }): Promise<{ [key: string]: unknown }[]> | { [key: string]: unknown }[];
}

export interface CacheConfig {
  enabled?: boolean;
  defaultTTL?: number;
  keyGenerator?: (query: any, context: any) => string;
}

export interface MultiApiStoreConfig {
  resources: { [resourceType: string]: ApiResourceConfig };
  specialHandlers?: SpecialHandler[];
  cache?: CacheConfig;
  selectEngine?: SelectExpressionEngine;
  whereEngine?: WhereExpressionEngine;
}

/**
 * Multi-API store that aggregates data from multiple API endpoints into a unified SpectraGraph interface.
 * Supports both read and write operations when configured with appropriate API handlers.
 */
export interface MultiApiStore {
  /**
   * Queries the multi-API store by fetching from configured API endpoints
   */
  query(query: RootQuery, options?: { [key: string]: unknown }, queryContext?: { [key: string]: unknown }): Promise<QueryResult>;
  
  /**
   * Creates a new resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support create operations
   */
  create(resource: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  
  /**
   * Updates an existing resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support update operations
   */
  update(resource: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  
  /**
   * Upsert operation - not supported by multi-API store
   * @throws StoreOperationNotSupportedError
   */
  upsert(): never;
  
  /**
   * Deletes a resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support delete operations
   */
  delete(resource: { [key: string]: unknown }): Promise<{ [key: string]: unknown }>;
  
  /**
   * Merge operation - not supported by multi-API store
   * @throws StoreOperationNotSupportedError
   */
  merge(): never;
}

/**
 * Creates a new multi-API store instance that aggregates data from multiple API endpoints
 */
export function createMultiApiStore(schema: Schema, config: MultiApiStoreConfig): MultiApiStore;