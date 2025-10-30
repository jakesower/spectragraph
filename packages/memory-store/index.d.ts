// TypeScript definitions for @spectragraph/memory-store
// Generated from JSDoc annotations

import type {
  Schema,
  RootQuery,
  Store,
  CreateResource,
  UpdateResource,
  DeleteResource,
  NormalResource,
  FlatResource,
  QueryResult,
  SelectExpressionEngine,
  WhereExpressionEngine
} from "@spectragraph/core";

export interface NormalResourceTree {
  type: string;
  id?: string;
  attributes?: { [k: string]: unknown };
  relationships?: {
    [k: string]: NormalResourceTree | NormalResourceTree[] | unknown;
  };
}

import type { Graph } from "@spectragraph/core";
import type { Ajv } from "ajv";

export interface MemoryStoreConfig {
  initialData?: Graph;
  validator?: Ajv;
  selectEngine?: SelectExpressionEngine;
  whereEngine?: WhereExpressionEngine;
}

/**
 * Memory store that extends the base Store interface with additional methods
 */
export interface MemoryStore extends Store {
  /**
   * Creates a new resource using flat format (attributes/relationships at root)
   */
  create(resourceType: string, resource: FlatResource): Promise<NormalResource>;
  /**
   * Creates a new resource using normalized format
   */
  create(resource: CreateResource): Promise<NormalResource>;

  /**
   * Updates an existing resource using flat format (attributes/relationships at root)
   */
  update(resourceType: string, resource: FlatResource): Promise<NormalResource>;
  /**
   * Updates an existing resource using normalized format
   */
  update(resource: UpdateResource): Promise<NormalResource>;

  /**
   * Creates or updates a resource using flat format (attributes/relationships at root)
   */
  upsert(resourceType: string, resource: FlatResource): Promise<NormalResource>;
  /**
   * Creates or updates a resource using normalized format
   */
  upsert(resource: CreateResource | UpdateResource): Promise<NormalResource>;

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