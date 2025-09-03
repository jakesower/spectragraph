// TypeScript definitions for @data-prism/jsonapi-server
// Generated from JSDoc annotations

import type { Schema, RootQuery } from "@data-prism/core";
import type { Application, Request, Response } from "express";

// === REQUEST/RESPONSE TYPES ===

export interface Ref {
	type: string;
	id: string;
}

export interface CreateRequest {
	data: {
		type: string;
		id?: string;
		attributes?: { [k: string]: unknown };
		relationships?: {
			[k: string]: Ref | Ref[];
		};
	};
}

// === SERVER TYPES ===

export interface Options {
	port?: number;
}

export interface Server {
	getAllHandler: (type: string) => (req: Request, res: Response) => Promise<void>;
	getOneHandler: (type: string) => (req: Request, res: Response) => Promise<void>;
	createHandler: (type: string) => (req: Request, res: Response) => Promise<void>;
	updateHandler: (type: string) => (req: Request, res: Response) => Promise<void>;
	deleteHandler: (type: string) => (req: Request, res: Response) => Promise<void>;
}

// === SERVER FUNCTIONS ===

/**
 * Creates JSON:API request handlers for a schema and store
 */
export function createJSONAPIHandlers(schema: Schema, store: any): Server;

/**
 * Applies JSON:API routes to an Express app based on schema resources
 */
export function applySchemaRoutes(schema: Schema, store: any, app: Application): void;

/**
 * Creates a complete Express server with JSON:API endpoints
 */
export function createServer(schema: Schema, store: any, options?: Options): void;

// === REQUEST/RESPONSE UTILITIES ===

/**
 * Parses JSON:API request parameters into Data Prism query format
 */
export function parseRequest(schema: Schema, params: any): RootQuery;

/**
 * Formats Data Prism query results into JSON:API response format
 */
export function formatResponse(schema: Schema, query: RootQuery, result: any): any;