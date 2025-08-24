// TypeScript definitions for @data-prism/memory-store
// Generated from JSDoc annotations

import type { 
  Schema, 
  RootQuery, 
  Store, 
  CreateResource, 
  UpdateResource, 
  DeleteResource, 
  NormalResource,
  QueryResult
} from "@data-prism/core";

export interface NormalResourceTree {
  type: string;
  id?: string;
  attributes?: { [k: string]: unknown };
  relationships?: {
    [k: string]: NormalResourceTree | NormalResourceTree[] | unknown;
  };
}

import type { Graph } from "@data-prism/core";
import type { Ajv } from "ajv";

export interface MemoryStoreConfig {
  initialData?: Graph;
  validator?: Ajv;
}

/**
 * Memory store that extends the base Store interface with additional methods
 */
export interface MemoryStore extends Store {
  /**
   * Links inverse relationships in the store
   */
  linkInverses(): void;
  
  /**
   * Merges a resource tree into the store
   */
  merge(resource: NormalResourceTree): Promise<NormalResourceTree>;
}

/**
 * Creates a new in-memory store instance
 */
export function createMemoryStore(schema: Schema, config?: MemoryStoreConfig): MemoryStore;