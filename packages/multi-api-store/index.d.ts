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
} from "@spectragraph/core";

/**
 * Handler configuration that users can provide
 */
export type UserHandlerConfig =
  | Function  // Shorthand: just a fetch function
  | {
      /** Function that fetches the resource data */
      fetch?: Function;
      /** Response mapping function */
      map?: (apiResource: any, context?: any) => any;
      /** Mappers for field transformation (compiled to map function) */
      mappers?: { [field: string]: string | Function };
    };

/**
 * Normalized handler configuration (after processing)
 */
export type RuntimeHandlerConfig = {
  /** Function that fetches the resource data */
  fetch: Function;
  /** Response mapping function */
  map?: (apiResource: any, context?: any) => any;
};

/**
 * Special handler that can override resource handlers based on conditions
 */
export interface SpecialHandler {
  /** Test function to determine if this handler should be used */
  test(query: any, context: any): boolean;
  /** The handler function to execute when test passes */
  handler(context: MiddlewareContext): Response | any | Promise<Response> | Promise<any>;
  /** Cache configuration for this special handler */
  cache?: Partial<CacheConfig>;
  /** Middleware specific to this handler */
  middleware?: MiddlewareFunction[];
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
  /** Runtime configuration for this step */
  config: RuntimeConfig;
  /** Cache wrapper function with pre-bound config and query */
  withCache: Function;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (context: MiddlewareContext, next: (context: MiddlewareContext) => Promise<any>) => Promise<any>;

/**
 * Base store configuration (what users provide)
 */
export interface MultiApiStoreConfig {
  /** Cache configuration */
  cache?: Partial<CacheConfig>;
  /** Middleware functions to apply to all requests */
  middleware?: MiddlewareFunction[];
  /** Request configuration */
  request?: Partial<RequestConfig>;
  /** Special handlers that override resource handlers based on conditions */
  specialHandlers?: SpecialHandler[];
  /** Query parameter serialization function */
  stringifyQueryParams?: (paramArray: Array<{ [key: string]: any }>) => string;

  /** Resource-specific configurations */
  resources?: {
    [resourceType: string]: {
      /** Cache config for this resource */
      cache?: Partial<CacheConfig>;
      /** Middleware for this resource */
      middleware?: MiddlewareFunction[];
      /** Query operation handler */
      query?: UserHandlerConfig;
      /** Create operation handler */
      create?: UserHandlerConfig;
      /** Update operation handler */
      update?: UserHandlerConfig;
      /** Delete operation handler */
      delete?: UserHandlerConfig;
    }
  };

  // Legacy support
  /** @deprecated Use request.baseURL instead */
  baseURL?: string;
}

/**
 * Runtime configuration (after normalization and defaults)
 */
export interface RuntimeConfig {
  /** Cache configuration */
  cache: CacheConfig;
  /** Middleware functions */
  middleware: MiddlewareFunction[];
  /** Request configuration */
  request: RequestConfig;
  /** Special handlers */
  specialHandlers: SpecialHandler[];
  /** Query parameter serialization function */
  stringifyQueryParams: (paramArray: Array<{ [key: string]: any }>) => string;
  /** Runtime operation handlers */
  query: RuntimeHandlerConfig;
  create: RuntimeHandlerConfig;
  update: RuntimeHandlerConfig;
  delete: RuntimeHandlerConfig;
}

/**
 * Store context object
 */
export interface StoreContext {
  /** The schema defining resource types and relationships */
  schema: Schema;
  /** Runtime store configuration */
  config: RuntimeConfig;
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
  simple: (config?: {
    logger?: Pick<Console, 'log' | 'error'>;
  }) => MiddlewareFunction;
  /** Creates monitoring middleware with configurable hooks */
  monitor: (config?: {
    hooks?: Array<{
      test: (result: any, context: any, info: { duration: number; cacheHit: boolean; error?: Error }) => boolean;
      action: (result: any, context: any, info: { duration: number; cacheHit: boolean; error?: Error }) => void;
    }>;
    onError?: (testError: Error, hook: any) => any;
  }) => MiddlewareFunction;
}

/**
 * Creates a new multi-API store instance that aggregates data from multiple API endpoints
 */
export function createMultiApiStore(schema: Schema, config?: MultiApiStoreConfig): MultiApiStore;

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