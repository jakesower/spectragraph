// TypeScript definitions for @spectragraph/jsonapi-store
// Generated from JSDoc annotations

import type { Schema, RootQuery, Store } from "@spectragraph/core";

// === TRANSPORT TYPES ===

export interface Transport {
	get(url: string): Promise<any>;
}

export interface StoreConfig {
	transport: Transport;
	baseURL: string;
}

// === STORE FUNCTIONS ===

/**
 * Creates a JSON:API store that proxies requests to a remote JSON:API server
 */
export function createJSONAPIStore(schema: Schema, config: StoreConfig): Store;

// === REQUEST/RESPONSE UTILITIES ===

/**
 * Formats a SpectraGraph query into a JSON:API request URL
 */
export function formatRequest(schema: Schema, config: { baseURL: string }, query: RootQuery): string;

/**
 * Parses a JSON:API response into SpectraGraph query results
 */
export function parseResponse(schema: Schema, query: RootQuery, response: any): any;