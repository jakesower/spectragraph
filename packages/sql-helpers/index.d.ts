// TypeScript definitions for @spectragraph/sql-helpers
// Generated from JSDoc annotations

import type { Schema, RootQuery, Query, NormalResource, CreateResource, UpdateResource, Graph } from "@spectragraph/core";

// === SQL QUERY TYPES ===

export interface SqlQuery {
	where?: string[];
	vars?: unknown[];
	select?: string[];
	from?: string[];
	join?: string[];
	orderBy?: string[];
	limit?: number;
	offset?: number;
}

export interface QueryBreakdownItem {
	path: string[];
	attributes: unknown;
	relationships: unknown;
	type: string;
	query: Query;
	ref: boolean;
	parentQuery: Query | null;
	parent: QueryBreakdownItem | null;
	parentRelationship: string | null;
}

export type QueryBreakdown = QueryBreakdownItem[];

// === OPERATOR DEFINITIONS ===

export interface OperatorDefinition {
	compile: (exprVal: unknown, compile: Function) => () => SqlQuery;
	preQuery?: boolean;
}

export interface ConstraintOperatorDefinitions {
	[key: string]: OperatorDefinition;
}

// === COLUMN TYPES ===

export interface ColumnTypeModifier {
	fromStorage: (value: unknown) => unknown;
	toStorage: (value: unknown) => unknown;
}

export interface ColumnTypeModifiers {
	[key: string]: ColumnTypeModifier;
}

// === RELATIONSHIP TYPES ===

export interface RelationshipBuilder {
	[key: string]: (context: unknown) => unknown;
}

export interface RelationshipBuilders {
	[key: string]: RelationshipBuilder;
}

export interface RelationshipMeta {
	foreignTable: string;
	foreignKey: string;
	localKey: string;
	type: "one" | "many";
}

export interface ManyToManyMeta extends RelationshipMeta {
	joinTable: string;
	joinLocalKey: string;
	joinForeignKey: string;
}

// === QUERY HELPER FUNCTIONS ===

/**
 * Flattens a nested query into a linear array of query breakdown items
 */
export function flattenQuery(schema: Schema, rootQuery: RootQuery): QueryBreakdown;

/**
 * Maps over all query breakdown items in a flattened query
 */
export function flatMapQuery<T>(
	schema: Schema,
	rootQuery: RootQuery,
	mapper: (item: QueryBreakdownItem) => T[]
): T[];

/**
 * Executes a function for each query breakdown item
 */
export function forEachQuery(
	schema: Schema,
	rootQuery: RootQuery,
	callback: (item: QueryBreakdownItem) => void
): void;

/**
 * Reduces a flattened query to a single value
 */
export function reduceQuery<T>(
	schema: Schema,
	rootQuery: RootQuery,
	reducer: (acc: T, item: QueryBreakdownItem) => T,
	initialValue: T
): T;

/**
 * Tests whether some query breakdown items satisfy a condition
 */
export function someQuery(
	schema: Schema,
	rootQuery: RootQuery,
	predicate: (item: QueryBreakdownItem) => boolean
): boolean;

// === RELATIONSHIP BUILDER FUNCTIONS ===

/**
 * Creates relationship builders for SQL queries
 */
export function makeRelationshipBuilders(schema: Schema): RelationshipBuilders;

/**
 * Processes relationships before query execution
 */
export function preQueryRelationships(
	schema: Schema,
	query: RootQuery,
	builders: RelationshipBuilders
): unknown;

// === CONSTRAINT OPERATOR FUNCTIONS ===

/**
 * Base constraint operator definitions that work across SQL databases
 */
export const baseConstraintOperatorDefinitions: ConstraintOperatorDefinitions;

/**
 * Creates constraint operators with custom definitions
 */
export function createConstraintOperators(
	customOperators?: Partial<ConstraintOperatorDefinitions>
): ConstraintOperatorDefinitions;

/**
 * Base SQL expression definitions
 */
export const baseSqlExpressions: ConstraintOperatorDefinitions;

// === GRAPH EXTRACTION ===

/**
 * Extracts a graph structure from SQL query results
 */
export function extractGraph(
	schema: Schema,
	rootQuery: RootQuery,
	rows: unknown[]
): Graph;

// === QUERY PARSING ===

/**
 * Extracts SQL query clauses from a normalized query
 */
export function extractQueryClauses(
	schema: Schema,
	query: RootQuery,
	options?: { operators?: ConstraintOperatorDefinitions }
): SqlQuery;

// === WHERE EXPRESSIONS ===

/**
 * Default where expression operators for SQL
 */
export const DEFAULT_WHERE_EXPRESSIONS: ConstraintOperatorDefinitions;

// === SELECT EXPRESSIONS ===

/**
 * Default select expression operators for SQL
 */
export const DEFAULT_SELECT_EXPRESSIONS: ConstraintOperatorDefinitions;

// === COLUMN TYPE FUNCTIONS ===

/**
 * Base column type modifiers for common data transformations
 */
export const baseColumnTypeModifiers: ColumnTypeModifiers;

/**
 * Creates column type modifiers with custom definitions
 */
export function createColumnTypeModifiers(
	customModifiers?: Partial<ColumnTypeModifiers>
): ColumnTypeModifiers;

/**
 * Transforms values for database storage using column type modifiers
 */
export function transformValuesForStorage(
	values: Record<string, unknown>,
	modifiers: ColumnTypeModifiers
): Record<string, unknown>;

// === RELATIONSHIP MANAGEMENT ===

/**
 * Gets foreign key relationships from schema
 */
export function getForeignRelationships(schema: Schema, type: string): RelationshipMeta[];

/**
 * Gets many-to-many relationships from schema
 */
export function getManyToManyRelationships(schema: Schema, type: string): ManyToManyMeta[];

/**
 * Gets metadata for a foreign relationship
 */
export function getForeignRelationshipMeta(
	schema: Schema,
	type: string,
	relationshipName: string
): RelationshipMeta;

/**
 * Gets metadata for a many-to-many relationship
 */
export function getManyToManyRelationshipMeta(
	schema: Schema,
	type: string,
	relationshipName: string
): ManyToManyMeta;

/**
 * Processes foreign relationships for SQL operations
 */
export function processForeignRelationships(
	schema: Schema,
	resource: NormalResource | CreateResource | UpdateResource,
	operation: "create" | "update"
): unknown;

/**
 * Processes many-to-many relationships for SQL operations
 */
export function processManyToManyRelationships(
	schema: Schema,
	resource: NormalResource | CreateResource | UpdateResource,
	operation: "create" | "update"
): unknown;

// === RESOURCE TRANSFORMATION ===

/**
 * Gets attribute columns for a resource type
 */
export function getAttributeColumns(schema: Schema, type: string): string[];

/**
 * Gets local relationships (foreign key relationships) for a resource type
 */
export function getLocalRelationships(schema: Schema, type: string): string[];

/**
 * Gets relationship columns for a resource type
 */
export function getRelationshipColumns(schema: Schema, type: string): string[];

/**
 * Gets ID columns for a resource type
 */
export function getIdColumns(schema: Schema, type: string): string[];

/**
 * Gets ID values from a resource
 */
export function getIdValues(resource: NormalResource | CreateResource | UpdateResource): unknown[];

/**
 * Transforms database row keys to resource attribute names
 */
export function transformRowKeys(
	row: Record<string, unknown>,
	keyTransformer: (key: string) => string
): Record<string, unknown>;

/**
 * Builds a resource object from database row data
 */
export function buildResourceObject(
	schema: Schema,
	type: string,
	row: Record<string, unknown>,
	options?: { keyTransformer?: (key: string) => string }
): NormalResource;

/**
 * Prepares values for database storage
 */
export function prepareValuesForStorage(
	values: Record<string, unknown>,
	options?: { keyTransformer?: (key: string) => string }
): Record<string, unknown>;

/**
 * Creates column configuration for SQL operations
 */
export function createColumnConfiguration(
	columns: string[],
	options?: { prefix?: string; transformer?: (key: string) => string }
): {
	columns: string[];
	placeholders: string[];
	values: unknown[];
};

/**
 * Creates SQL placeholders for parameterized queries
 */
export function createPlaceholders(
	count: number,
	options?: { start?: number; prefix?: string }
): string[];

/**
 * Creates SET clause for SQL UPDATE statements
 */
export function createUpdateSetClause(
	columns: string[],
	options?: { transformer?: (key: string) => string }
): string;

/**
 * Creates conflict resolution clause for SQL UPSERT statements
 */
export function createUpsertConflictClause(
	schema: Schema,
	type: string,
	options?: { transformer?: (key: string) => string }
): string;
