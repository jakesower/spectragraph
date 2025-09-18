// TypeScript definitions for @spectragraph/multi-api-store

import type {
  Schema,
  Store,
  RootQuery,
  NormalRootQuery,
  QueryResult,
  CreateResource,
  UpdateResource,
  DeleteResource,
  SelectExpressionEngine,
  WhereExpressionEngine,
  Graph
} from "@spectragraph/core";

/**
 * Handler configuration for a specific operation
 */
export interface HandlerConfig {
  /** The fetch function that performs the actual operation */
  fetch: (context: any) => Promise<any> | any;
  /** Response mapping function (Form 2) */
  map?: (response: any) => any;
  /** Mappers configuration for response transformation (Form 3 - preferred) */
  mappers?: {
    fromApi?: { [field: string]: string | ((resource: any) => any) };
    toApi?: { [field: string]: string | ((resource: any) => any) };
  };
}

/**
 * Resource configuration with handlers object format
 */
export interface ResourceConfig {
  /** Cache configuration specific to this resource */
  cache?: {
    /** Whether to enable manual cache control for this resource */
    manual?: boolean;
    /** Custom TTL for this resource type */
    defaultTTL?: number;
  };
  /** Handler definitions for each operation */
  handlers?: {
    get?: HandlerConfig;
    create?: HandlerConfig;
    update?: HandlerConfig;
    delete?: HandlerConfig;
  };
}

/**
 * Special handler that can override resource handlers based on conditions
 */
export interface SpecialHandler {
  /** Test function to determine if this handler should be used */
  test(query: NormalRootQuery, context: any): boolean;
  /** The handler function to execute */
  handler(context: any): Promise<any> | any;
  /** Cache configuration for this special handler */
  cache?: {
    manual?: boolean;
    defaultTTL?: number;
  };
}

/**
 * Cache configuration with relationship-aware invalidation
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled?: boolean;
  /** Whether to use manual cache control */
  manual?: boolean;
  /** Default time-to-live for cache entries in milliseconds */
  defaultTTL?: number;
  /** Function to generate cache keys */
  generateKey?: (query: NormalRootQuery, context?: any) => string;
  /** Function to determine which resource types a query depends on for cache invalidation */
  dependsOnTypes?: (query: NormalRootQuery, options?: { schema?: Schema }) => string[];
}

/**
 * Request configuration for standard HTTP handlers
 */
export interface RequestConfig {
  /** Base URL for HTTP requests */
  baseURL?: string;
  /** Default headers to include in requests */
  headers?: { [key: string]: string };
  /** Default query parameters to include in requests */
  queryParams?: Array<{ [key: string]: any }>;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (context: any, next: (context: any) => Promise<any>) => Promise<any>;

/**
 * Configuration for multi-api-store
 */
export interface MultiApiStoreConfig {
  /** Resource-specific configurations */
  resources?: { [resourceType: string]: ResourceConfig };
  /** Special handlers that override resource handlers based on conditions */
  specialHandlers?: SpecialHandler[];
  /** Cache configuration */
  cache?: CacheConfig;
  /** Middleware functions to apply to all requests */
  middleware?: MiddlewareFunction[];
  /** Base URL for standard HTTP handlers (legacy, use request.baseURL instead) */
  baseURL?: string;
  /** Request configuration for standard handlers */
  request?: RequestConfig;
  /** Custom select expression engine */
  selectEngine?: SelectExpressionEngine;
  /** Custom where expression engine */
  whereEngine?: WhereExpressionEngine;
  /** Query parameter serialization function */
  stringifyQueryParams?: (queryParams: Array<{ [key: string]: any }>) => string;
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
  get: (context: any) => Promise<Response>;
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
export function createMultiApiStore(schema: Schema, config?: MultiApiStoreConfig): MultiApiStore;

/**
 * Creates a simple TTL-based cache for multi-api-store with relationship-aware invalidation
 */
export function createCache(): {
  withCache: (key: string, fetcher: () => any, options: any) => any;
  clearByType: (type: string, config: any, options?: any) => void;
  clear: () => void;
  clearKey: (key: string) => void;
};

/**
 * Loads all the data needed for a query to run, including its subqueries
 */
export function loadQueryGraph(rootQuery: NormalRootQuery, storeContext: any): Promise<Graph>;

// Helper functions
export function compileFormatter(templates: any, pivot: string, keys: string[]): (vars: any) => string;
export function compileWhereFormatter(templates: any): (vars: any) => string;
export function compileOrderFormatter(templates: any): (vars: any) => string;
export function compileResourceMappers(schema: Schema, type: string, mappers: any): (resource: any) => any;
export function buildAsyncMiddlewarePipe(middleware: MiddlewareFunction[]): (val: any) => any;
export function handleFetchResponse(response: Response | any): Promise<any>;

// Standard handlers and default configuration
export const standardHandlers: StandardHandlers;
export const defaultConfig: MultiApiStoreConfig;

// Middleware collections
export const auth: AuthMiddleware;
export const retry: RetryMiddleware;
export const log: LogMiddleware;