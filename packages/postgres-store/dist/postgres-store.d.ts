// TypeScript definitions for @data-prism/postgres-store
// Generated from JSDoc annotations

import type { Client } from "pg";
import type { Ajv } from "ajv";
import type { Schema, RootQuery } from "@data-prism/core"

// === RESOURCE TYPES ===

export interface Ref {
	type: string;
	id: string;
}

export interface Resource {
	type: string;
	id: any;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] };
}

export interface CreateResource {
	type: string;
	id?: string;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] };
}

export interface UpdateResource {
	type: string;
	id: any;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] };
}

export interface DeleteResource {
	type: string;
	id: any;
}

// === JOIN TYPES ===

export interface LocalJoin {
	localColumn: string;
	localColumnType?: string;
}

export interface ForeignJoin {
	foreignColumn: string;
	foreignColumnType?: string;
}

export interface ManyToManyJoin {
	joinTable: string;
	localJoinColumn: string;
	localJoinColumnType?: string;
	foreignJoinColumn: string;
	foreignJoinColumnType?: string;
}

// === CONFIG TYPES ===

export interface Config {
	db: Client;
	resources: {
		[k: string]: {
			table: string;
			idType?: string;
			columns?: {
				[k: string]: {
					select?: (table: string, col: string) => string;
				};
			};
			joins?: {
				[k: string]: LocalJoin | ForeignJoin | ManyToManyJoin;
			};
		};
	};
	validator?: Ajv;
}

export interface Context {
	config: Config;
	schema: Schema;
}

export interface GetOptions {
	order?: { [k: string]: "asc" | "desc" };
	limit?: number;
	offset?: number;
	where?: { [k: string]: unknown };
}

// === STORE INTERFACE ===

export interface PostgresStore {
	getAll(type: string, options?: GetOptions): Promise<Resource[]>;
	getOne(type: string, id: string, options?: GetOptions): Promise<Resource>;
	create(resource: CreateResource): Promise<Resource>;
	update(resource: UpdateResource): Promise<Resource>;
	upsert(resource: CreateResource | UpdateResource): Promise<Resource>;
	delete(resource: DeleteResource): Promise<DeleteResource>;
	query(query: RootQuery): Promise<any>;
}

// === MAIN FUNCTION ===

/**
 * Creates a PostgreSQL store instance
 */
export function createPostgresStore(schema: Schema, config: Config): PostgresStore;