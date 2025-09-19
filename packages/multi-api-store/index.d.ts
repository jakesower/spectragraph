// TypeScript definitions for @spectragraph/multi-api-store

import type {
  Schema,
  Store,
  RootQuery,
  NormalRootQuery,
  NormalQuery,
  QueryResult,
  CreateResource,
  UpdateResource,
  DeleteResource,
  SelectExpressionEngine,
  WhereExpressionEngine,
  Graph
} from "@spectragraph/core";

/**
 * Resource operation configuration
 */
export interface ResourceOperationConfig {
  /** Function that actually fetches the resource data. Signature varies by operation type. */
  fetch?: Function;
  /** A mapping function applied to each resource after fetching */
  map?: (apiResource: any, context?: any) => any;
  /** An object defining mappings for each resource attribute and relationship. Ignored if map is present. */
  mappers?: { [field: string]: string | Function };
}

/**
 * Base configuration interface
 */
export interface Config {
  /** Config for the cache */
  cache?: CacheConfig;
  /** Middleware functions to apply to all requests */
  middleware?: MiddlewareFunction[];
  /** Default request configuration */
  request?: RequestConfig;
  /** Special handlers that override resource handlers based on conditions */
  specialHandlers?: SpecialHandler[];
  /** Query parameter serialization function */
  stringifyQueryParams?: (paramArray: Array<{ [key: string]: any }>) => string;
  /** Fetch and map definitions for query operations */
  query?: Function | ResourceOperationConfig;
  /** Fetch and map definitions for create operations */
  create?: Function | ResourceOperationConfig;
  /** Fetch and map definitions for update operations */
  update?: Function | ResourceOperationConfig;
  /** Fetch and map definitions for delete operations */
  delete?: Function | ResourceOperationConfig;
}

/**
 * Special handler that can override resource handlers based on conditions
 */
export interface SpecialHandler extends Config {
  /** Test function to determine if this handler should be used */
  test(query: any, context: any): boolean;
  /** The handler function to execute when test passes */
  handler(context: MiddlewareContext): Response | any | Promise<Response> | Promise<any>;
}

/**
 * Cache configuration with relationship-aware invalidation
 */
export interface CacheConfig {
  /** Function to determine which resource types the query depends on for caching */
  dependsOnTypes?: (query: any, options?: any) => string[];
  /** Whether caching is enabled */
  enabled?: boolean;
  /** Custom cache key generator */
  generateKey?: (query: any, context?: any) => string;
  /** Whether to bypass caching */
  manual?: boolean;
  /** Default TTL for the cache in milliseconds */
  ttl?: number;
}

/**
 * Request configuration for standard HTTP handlers
 */
export interface RequestConfig {
  /** Base URL for standard HTTP handlers */
  baseURL?: string;
  /** HTTP headers to be sent with the request */
  headers?: { [key: string]: any };
  /** Initial query params */
  queryParams?: Array<{ [key: string]: any }>;
  /** The query string (typically constructed with stringifyQueryParams) */
  queryParamsStr?: string;
}

/**
 * Middleware context passed to middleware functions
 */
export interface MiddlewareContext {
  /** Schema defining resource types and relationships */
  schema: Schema;
  /** The current query being processed */
  query: NormalRootQuery;
  /** Request configuration for this step */
  request: RequestConfig;
  /** Parent query in the hierarchy */
  parentQuery: NormalQuery | null;
  /** Full merged configuration for this step */
  config: FullConfig;
  /** Cache wrapper function with pre-bound config and query */
  withCache: Function;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (context: MiddlewareContext, next: (context: MiddlewareContext) => Promise<any>) => Promise<any>;

/**
 * Normalized configuration (after processing function shorthands)
 */
export interface NormalConfig {
  /** Config for the cache */
  cache?: CacheConfig;
  /** Middleware functions to apply to all requests */
  middleware?: MiddlewareFunction[];
  /** Default request configuration */
  request?: RequestConfig;
  /** Special handlers that override resource handlers based on conditions */
  specialHandlers?: SpecialHandler[];
  /** Query parameter serialization function */
  stringifyQueryParams?: (paramArray: Array<{ [key: string]: any }>) => string;
  /** Fetch and map definitions for query operations */
  query?: ResourceOperationConfig;
  /** Fetch and map definitions for create operations */
  create?: ResourceOperationConfig;
  /** Fetch and map definitions for update operations */
  update?: ResourceOperationConfig;
  /** Fetch and map definitions for delete operations */
  delete?: ResourceOperationConfig;
}

/**
 * Full configuration with all required properties
 */
export interface FullConfig {
  /** Config for the cache */
  cache: CacheConfig;
  /** Middleware functions to apply to all requests */
  middleware: MiddlewareFunction[];
  /** Default request configuration */
  request: RequestConfig;
  /** Special handlers that override resource handlers based on conditions */
  specialHandlers: SpecialHandler[];
  /** Query parameter serialization function */
  stringifyQueryParams: (paramArray: Array<{ [key: string]: any }>) => string;
  /** Fetch and map definitions for query operations */
  query: ResourceOperationConfig;
  /** Fetch and map definitions for create operations */
  create: ResourceOperationConfig;
  /** Fetch and map definitions for update operations */
  update: ResourceOperationConfig;
  /** Fetch and map definitions for delete operations */
  delete: ResourceOperationConfig;
}

/**
 * Store configuration
 */
export interface StoreConfig extends Config {
  /** Resource-specific handler configurations */
  resources?: { [resourceType: string]: Config };
}

/**
 * Store context object
 */
export interface StoreContext {
  /** The schema defining resource types and relationships */
  schema: Schema;
  /** Normalized store configuration */
  config: NormalConfig;
  /** Cache wrapper function */
  withCache: Function;
  /** Cache instance with methods for clearing and managing cache entries */
  cache: any;
}

/**
 * Multi-API store that aggregates data from multiple API endpoints into a unified SpectraGraph interface.
 * Supports both read and write operations when configured with appropriate API handlers.
 * Implements the Store interface from @spectragraph/core.
 */
export interface MultiApiStore extends Store {
  /**
   * Queries the multi-API store by fetching from configured API endpoints
   */
  query(query: RootQuery, queryContext?: any): Promise<QueryResult>;

  /**
   * Creates a new resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support create operations
   */
  create(resource: CreateResource): Promise<any>;

  /**
   * Updates an existing resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support update operations
   */
  update(resource: UpdateResource): Promise<any>;

  /**
   * Upsert operation - creates or updates a resource based on whether it has an ID
   */
  upsert(resource: CreateResource | UpdateResource): Promise<any>;

  /**
   * Deletes a resource using the configured API handler
   * @throws StoreOperationNotSupportedError if resource type doesn't support delete operations
   */
  delete(resource: DeleteResource): Promise<any>;

  /**
   * Merge operation - not supported by multi-API store
   * @throws StoreOperationNotSupportedError
   */
  merge(): never;
}

// Standard handlers for RESTful API operations
export interface StandardHandlers {
  /** GET handler for fetching resources */
  query: (context: any) => Promise<Response>;
  /** POST handler for creating resources */
  create: (resource: CreateResource, context: any) => Promise<Response>;
  /** PATCH handler for updating resources */
  update: (resource: UpdateResource, context: any) => Promise<Response>;
  /** DELETE handler for removing resources */
  delete: (resource: DeleteResource, context: any) => Promise<Response>;
}

// Middleware collections
export interface AuthMiddleware {
  /** Creates middleware for Bearer token authentication */
  bearerToken: (getToken: () => string) => MiddlewareFunction;
  /** Creates middleware for query parameter authentication */
  queryParam: (paramName: string, getValue: () => string) => MiddlewareFunction;
}

export interface RetryMiddleware {
  /** Creates middleware with exponential backoff retry logic */
  exponential: (config?: {
    maxRetries?: number;
    backoffFn?: (attempt: number) => number;
    timeout?: number;
  }) => MiddlewareFunction;
}

export interface LogMiddleware {
  /** Creates middleware for logging request/response information */
  requests: (config?: {
    logger?: Pick<Console, 'log'>;
    includeTiming?: boolean;
  }) => MiddlewareFunction;
}

/**
 * Creates a new multi-API store instance that aggregates data from multiple API endpoints
 */
export function createMultiApiStore(schema: Schema, config?: StoreConfig): MultiApiStore;

// Helper functions
/**
 * Handles Response objects from handlers, extracting data with error handling.
 * @param response - Response object or direct data
 * @param fallbackValue - Value to return for empty successful responses
 * @returns Parsed data or original value
 * @throws When response indicates an error status
 */
export function handleResponseData(response: Response | any, fallbackValue?: any): Promise<any>;

// Middleware collections
export const auth: AuthMiddleware;
export const retry: RetryMiddleware;
export const log: LogMiddleware;