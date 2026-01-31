// TypeScript definitions for @spectragraph/core
// Generated from JSDoc annotations

import type { Ajv, DefinedError } from "ajv";

// === JSON SCHEMA ===

export type JSONSchemaType =
	| "null"
	| "boolean"
	| "object"
	| "array"
	| "number"
	| "string"
	| "integer";

export interface JSONSchemaDefinition {
	[key: string]: JSONSchema;
}

export interface JSONSchema {
	// Schema identification
	$id?: string;
	$schema?: string;
	$ref?: string;
	$comment?: string;

	// Meta-data
	title?: string;
	description?: string;
	default?: unknown;
	readOnly?: boolean;
	writeOnly?: boolean;
	examples?: unknown[];

	// Type validation
	type?: JSONSchemaType | JSONSchemaType[];

	// Numeric validation
	multipleOf?: number;
	maximum?: number;
	exclusiveMaximum?: number;
	minimum?: number;
	exclusiveMinimum?: number;

	// String validation
	maxLength?: number;
	minLength?: number;
	pattern?: string;

	// Array validation
	items?: JSONSchema | JSONSchema[];
	additionalItems?: JSONSchema;
	maxItems?: number;
	minItems?: number;
	uniqueItems?: boolean;
	contains?: JSONSchema;

	// Object validation
	maxProperties?: number;
	minProperties?: number;
	required?: string[];
	properties?: { [key: string]: JSONSchema };
	patternProperties?: { [pattern: string]: JSONSchema };
	additionalProperties?: JSONSchema | boolean;
	dependencies?: {
		[key: string]: JSONSchema | string[];
	};
	propertyNames?: JSONSchema;

	// Generic validation
	const?: unknown;
	enum?: unknown[];

	// Combining schemas
	allOf?: JSONSchema[];
	anyOf?: JSONSchema[];
	oneOf?: JSONSchema[];
	not?: JSONSchema;

	// Conditional schemas
	if?: JSONSchema;
	then?: JSONSchema;
	else?: JSONSchema;

	// Format validation (Draft 07 formats)
	format?:
		| "date-time"
		| "time"
		| "date"
		| "duration"
		| "email"
		| "idn-email"
		| "hostname"
		| "idn-hostname"
		| "ipv4"
		| "ipv6"
		| "uri"
		| "uri-reference"
		| "iri"
		| "iri-reference"
		| "uri-template"
		| "json-pointer"
		| "relative-json-pointer"
		| "regex"
		| string; // Allow custom formats

	// Schema composition
	definitions?: JSONSchemaDefinition;
	$defs?: JSONSchemaDefinition;

	// Content validation (Draft 07)
	contentMediaType?: string;
	contentEncoding?: string;

	// Allow additional properties for extensions
	[key: string]: unknown;
}

// === SCHEMA TYPES ===

export interface SchemaRelationship {
	type: string;
	cardinality: "one" | "many";
	inverse?: string;
	required?: boolean;
}

export interface SchemaResource {
	idAttribute?: string;
	attributes: { [k: string]: JSONSchema };
	relationships: { [k: string]: SchemaRelationship };
	requiredAttributes?: string[];
	requiredRelationships?: string[];
}

export interface Schema {
	$schema?: string;
	$id?: string;
	title?: string;
	description?: string;
	meta?: unknown;
	version?: string;
	resources: { [k: string]: SchemaResource };
}

// === QUERY TYPES ===

export interface Expression {
	[key: string]: unknown;
}

export interface SliceClause {
	limit?: number;
	offset?: number;
	before?: { [k: string]: unknown };
	after?: { [k: string]: unknown };
}

export type SelectClause =
	| readonly (string | { [k: string]: string | Query | Expression })[]
	| { [k: string]: string | Query | Expression | SelectClause }
	| "*";

/**
 * Group clause for aggregation queries.
 * Use `by: []` to create grand totals (aggregate all resources into one group).
 */
export interface GroupClause {
	by: string | string[];
	select?: SelectClause;
	aggregates?: { [k: string]: Expression };
	where?: Expression | { [k: string]: unknown };
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	slice?: SliceClause;
	group?: GroupClause;
}

export interface NormalGroupClause {
	by: string | string[];
	select?: { [k: string]: string | Expression };
	aggregates?: { [k: string]: Expression };
	where?: Expression | { [k: string]: unknown };
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	slice?: SliceClause;
	group?: NormalGroupClause;
}

interface BaseSelectQuery {
	slice?: SliceClause;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select: SelectClause;
	type?: string;
	where?: { [k: string]: unknown };
	group?: never;
}

interface BaseGroupQuery {
	slice?: SliceClause;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	group: GroupClause;
	type?: string;
	where?: { [k: string]: unknown };
	select?: never;
}

type BaseQuery = BaseSelectQuery | BaseGroupQuery;

export type Query =
	| (BaseSelectQuery & { id: string; ids?: never })
	| (BaseSelectQuery & { id?: never; ids: string[] })
	| (BaseSelectQuery & { id?: never; ids?: never })
	| (BaseGroupQuery & { id?: string; ids?: string[] });

export type QueryOrSelect = Query | SelectClause;

export type RootQuery =
	| (Omit<BaseSelectQuery, "type"> & {
			type: string;
			id?: string;
			ids?: string[];
	  })
	| (Omit<BaseGroupQuery, "type"> & {
			type: string;
			ids?: string[];
	  });

export interface NormalSelectQuery
	extends Omit<BaseSelectQuery, "select" | "type"> {
	select: { [k: string]: string | NormalQuery | Expression };
	order?: { [k: string]: "asc" | "desc" }[];
	type: string;
	id?: string;
	ids?: string[];
}

export interface NormalGroupQuery
	extends Omit<BaseGroupQuery, "group" | "type"> {
	group: NormalGroupClause;
	order?: { [k: string]: "asc" | "desc" }[];
	type: string;
	ids?: string[];
}

export type NormalQuery = NormalSelectQuery | NormalGroupQuery;

// === RESOURCE TYPES ===

export interface Ref {
	type: string;
	id: string | number;
}

export interface BaseResource {
	type: string;
}

export interface NormalResource extends BaseResource {
	id: string | number;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
}

export interface PartialNormalResource extends BaseResource {
	id?: string | number;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] | null };
}

export interface CreateResource extends BaseResource {
	id?: number | string;
	new?: true;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] | null };
}

export interface UpdateResource extends BaseResource {
	id: number | string;
	new?: false;
	attributes?: { [k: string]: unknown };
	relationships?: { [k: string]: Ref | Ref[] | null };
}

export type DeleteResource = Ref;

/**
 * Flat resource format where attributes and relationships are at the root level.
 * Relationships can be specified as ID strings, Ref objects, or arrays thereof.
 */
export interface FlatResource {
	[k: string]: unknown;
}

// === GRAPH TYPES ===

export interface Graph {
	[resourceType: string]: { [resourceId: string]: NormalResource };
}

export interface QueryGraph {
	query(query: RootQuery): QueryResult;
}

// === RESULT TYPES ===

export type QueryResult = { [k: string]: unknown } | { [k: string]: unknown }[];

// === STORE TYPES ===

/**
 * Generic store interface for data persistence
 */
export interface Store {
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
	 * Deletes a resource
	 */
	delete(resource: DeleteResource): Promise<DeleteResource>;

	/**
	 * Creates or updates a resource using flat format (attributes/relationships at root)
	 */
	upsert(resourceType: string, resource: FlatResource): Promise<NormalResource>;
	/**
	 * Creates or updates a resource using normalized format
	 */
	upsert(resource: CreateResource | UpdateResource): Promise<NormalResource>;

	/**
	 * Queries the store
	 */
	query(query: RootQuery): Promise<QueryResult>;
}

// === STORE HELPER FUNCTIONS ===

/**
 * Creates a store mutation operation that accepts both flat and normalized resource formats.
 *
 * Store mutations (create, update, upsert) can accept resources in two formats:
 * 1. Flat format: operation(resourceType, flatResource) - attributes and relationships at root
 * 2. Normalized format: operation(normalResource) - structured with type/id/attributes/relationships
 *
 * This function handles parameter validation, normalization, and execution for both formats.
 *
 * @param schema - The schema defining resource types and relationships
 * @param method - The method name (for error messages, e.g., "create", "update", "upsert")
 * @param fn - The function to execute with the normalized resource
 * @returns A function that accepts either flat or normalized format
 *
 * @example
 * ```typescript
 * // In a store implementation:
 * const create = storeMutation(schema, "create", (normalResource) => {
 *   ensureValidCreateResource(schema, normalResource, validator);
 *   return createAction(normalResource, context);
 * });
 *
 * // Users can then call with flat format:
 * store.create("bears", { name: "Grumpy", furColor: "blue", home: "home-123" });
 *
 * // Or normalized format:
 * store.create({
 *   type: "bears",
 *   attributes: { name: "Grumpy", furColor: "blue" },
 *   relationships: { home: { type: "homes", id: "home-123" } }
 * });
 * ```
 */
export function storeMutation<T>(
	schema: Schema,
	method: string,
	fn: (normalResource: NormalResource) => T,
): {
	(resourceType: string, flatResource: FlatResource): T;
	(normalResource: CreateResource | UpdateResource): T;
};

// === SCHEMA FUNCTIONS ===

/**
 * Validates that a schema is valid
 * @param schema - The schema to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateSchema(
	schema: unknown,
	options?: { validator?: Ajv },
): DefinedError[];

/**
 * Validates that a schema is valid
 * @param schema - The schema to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @throws If the schema is invalid
 */
export function ensureValidSchema(
	schema: unknown,
	options?: { validator?: Ajv },
): void;

// === QUERY FUNCTIONS ===

/**
 * Validates that a query is valid against the schema
 * @param schema - The schema object
 * @param query - The query to validate
 * @param options - Validation options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.whereEngine - Expression engine for WHERE clauses
 * @returns Array of validation errors
 */
export function validateQuery(
	schema: Schema,
	query: RootQuery,
	options?: {
		selectEngine?: SelectExpressionEngine;
		whereEngine?: WhereExpressionEngine;
	},
): DefinedError[];

/**
 * Validates that a query is valid against the schema
 * @param schema - The schema object
 * @param query - The query to validate
 * @param options - Validation options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.whereEngine - Expression engine for WHERE clauses
 * @throws If the query is invalid
 */
export function ensureValidQuery(
	schema: Schema,
	query: RootQuery,
	options?: {
		selectEngine?: SelectExpressionEngine;
		whereEngine?: WhereExpressionEngine;
	},
): void;

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param schema - The schema object
 * @param rootQuery - The query to normalize
 * @param options - Normalization options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.whereEngine - Expression engine for WHERE clauses
 * @returns The normalized query
 */
export function normalizeQuery(
	schema: Schema,
	rootQuery: RootQuery,
	options?: {
		selectEngine?: SelectExpressionEngine;
		whereEngine?: WhereExpressionEngine;
	},
): NormalQuery;

/**
 * Extent structure representing attributes and relationships referenced in a query clause.
 */
export interface QueryExtent {
	/** Array of attribute names referenced */
	attributes: string[];
	/** Map of relationship names to their nested extents */
	relationships: { [relationshipName: string]: QueryExtent };
}

/**
 * Extent structure organized by query clause type.
 */
export interface QueryExtentByClause {
	/** Extent of attributes/relationships referenced in select clause */
	select: QueryExtent;
	/** Extent of attributes/relationships referenced in where clause */
	where: QueryExtent;
	/** Extent of attributes/relationships referenced in order clause */
	order: QueryExtent;
	/** Extent of attributes/relationships referenced in group clause */
	group: QueryExtent;
}

/**
 * Analyzes a query to determine which schema attributes and relationships are referenced
 * by each query clause (select, where, order, group).
 *
 * This enables fine-grained optimization by store implementations:
 * - SQL stores can determine which columns are needed for WHERE vs SELECT
 * - Access control can apply different permissions to filter vs display fields
 * - Query optimizers can fetch minimal data incrementally
 *
 * @param schema - The schema defining resource types and relationships
 * @param query - The query object to analyze
 * @returns Object containing separate extents for each clause type
 *
 * @example
 * ```typescript
 * const extents = getQueryExtentByClause(schema, {
 *   type: "bears",
 *   select: ["name"],
 *   where: { furColor: "brown" },
 *   order: { yearIntroduced: "asc" }
 * });
 * // Returns:
 * // {
 * //   select: { attributes: ["name"], relationships: {} },
 * //   where: { attributes: ["furColor"], relationships: {} },
 * //   order: { attributes: ["yearIntroduced"], relationships: {} },
 * //   group: { attributes: [], relationships: {} }
 * // }
 * ```
 */
export function getQueryExtentByClause(
	schema: Schema,
	query: RootQuery,
): QueryExtentByClause;

/**
 * Analyzes a query to determine the complete set of schema attributes and relationships
 * referenced across all query clauses (select, where, order, group), merged into a single extent.
 *
 * This is useful for store implementations to optimize data fetching by:
 * - Determining which database columns to SELECT in SQL queries
 * - Knowing which API endpoints/fields to fetch in multi-API stores
 * - Building minimal GraphQL queries
 * - Validating access permissions for specific paths
 *
 * @param schema - The schema defining resource types and relationships
 * @param query - The query object to analyze
 * @returns Single merged extent containing all referenced attributes and relationships
 *
 * @example
 * ```typescript
 * const extent = getFullQueryExtent(schema, {
 *   type: "bears",
 *   select: ["name"],
 *   where: { furColor: "brown" },
 *   order: { yearIntroduced: "asc" }
 * });
 * // Returns:
 * // {
 * //   attributes: ["name", "furColor", "yearIntroduced"],
 * //   relationships: {}
 * // }
 * ```
 */
export function getFullQueryExtent(schema: Schema, query: RootQuery): QueryExtent;

// === GRAPH FUNCTIONS ===

/**
 * Creates an empty graph structure based on a schema
 * @param schema - The schema to base the graph on
 * @returns Empty graph structure
 */
export function createEmptyGraph(schema: Schema): Graph;

/**
 * Links inverse relationships in a graph
 * @param schema - The schema defining relationships
 * @param graph - The graph to link inverses in
 * @returns Graph with inverse relationships linked
 */
export function linkInverses(schema: Schema, graph: Graph): Graph;

/**
 * Merges two graphs together by combining resource collections
 * @param left - The left graph
 * @param right - The right graph (takes precedence for conflicting IDs)
 * @returns Merged graph
 */
export function mergeGraphs(left: Graph, right: Graph): Graph;

/**
 * Merges two graphs together, merging individual resources with matching IDs
 * @param left - The left graph
 * @param right - The right graph
 * @returns Merged graph with resources merged using mergeNormalResources
 */
export function mergeGraphsDeep(left: Graph, right: Graph): Graph;

/**
 * Creates a complete graph from an array of resource objects, recursively processing nested relationships
 * @param schema - The schema defining the resource structure
 * @param resourceType - The root resource type to process
 * @param resources - Array of flat resource objects to convert
 * @returns Complete graph with all discoverable resources from the input data
 */
export function createGraphFromResources(
	schema: Schema,
	resourceType: string,
	resources: { [k: string]: unknown }[],
): Graph;

/**
 * Creates a query graph from a schema and graph
 * @param schema - The schema defining relationships
 * @param graph - The graph to create query graph from
 * @returns Query graph instance
 */
export function createQueryGraph(schema: Schema, graph: Graph): QueryGraph;

/**
 * Executes a query against a graph
 * @param schema - The schema defining relationships
 * @param query - The query to execute
 * @param graph - The graph to query
 * @param options - Query options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.whereEngine - Expression engine for WHERE clauses
 * @returns Query result
 */
export function queryGraph(
	schema: Schema,
	query: RootQuery,
	graph: Graph,
	options?: {
		selectEngine?: SelectExpressionEngine;
		whereEngine?: WhereExpressionEngine;
	},
): QueryResult;

// === RESOURCE FUNCTIONS ===

/**
 * Converts a resource object to normal form
 * @param schema - The schema defining the resource structure
 * @param resourceType - The type of resource being normalized
 * @param resource - The flat resource data
 * @returns Normalized resource with separated attributes and relationships
 */
export function normalizeResource(
	schema: Schema,
	resourceType: string,
	resource: { [k: string]: unknown },
): NormalResource;

/**
 * Merges two partial resources of the same type, combining their attributes and relationships
 * @param left - The first resource to merge
 * @param right - The second resource to merge
 * @returns Merged resource with combined attributes and relationships
 * @throws Error if resources are of different types or have conflicting IDs
 */
export function mergeNormalResources(
	left: PartialNormalResource,
	right: PartialNormalResource,
): PartialNormalResource;

/**
 * Creates a new validator instance
 * @param options - Validator options
 * @param options.ajvSchemas - Additional schemas to add
 * @returns Configured validator instance
 */
export function createValidator(options?: { ajvSchemas?: unknown[] }): Ajv;

/**
 * Creates a flat resource from a partial resource and schema
 * @param schema - The schema defining the resource structure
 * @param resourceType - The type of resource to build
 * @param partialResource - The partial resource data
 * @param options - Optional configuration
 * @param options.includeRelationships - Whether to include default values for relationships not present in partialResource. When false, only relationships explicitly provided in partialResource will be included (useful when relationships will be linked later via linkInverses). Defaults to true.
 * @returns Complete flat resource with defaults applied
 */
export function buildResource(
	schema: Schema,
	resourceType: string,
	partialResource?: FlatResource,
	options?: { includeRelationships?: boolean },
): FlatResource;

/**
 * Creates a normalized resource from a partial resource and schema
 * @param schema - The schema defining the resource structure
 * @param resourceType - The type of resource to build
 * @param partialResource - The partial resource data
 * @param options - Optional configuration
 * @param options.includeRelationships - Whether to include default values for relationships not present in partialResource. When false, only relationships explicitly provided in partialResource will be included (useful when relationships will be linked later via linkInverses). Defaults to true.
 * @returns Complete normalized resource
 */
export function buildNormalResource(
	schema: Schema,
	resourceType: string,
	partialResource?: FlatResource,
	options?: { includeRelationships?: boolean },
): NormalResource;

/**
 * Validates a create resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @param validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateCreateResource(
	schema: Schema,
	resource: CreateResource,
	options?: { validator?: Ajv },
): DefinedError[];

/**
 * Validates an update resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @param validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateUpdateResource(
	schema: Schema,
	resource: UpdateResource,
	options?: { validator?: Ajv },
): DefinedError[];

/**
 * Validates a delete resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @returns Array of validation errors
 */
export function validateDeleteResource(
	schema: Schema,
	resource: DeleteResource,
): DefinedError[];

/**
 * Validates a resource tree that will be merged into a graph
 * @param schema - The schema to validate against
 * @param resource - The resource tree to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateMergeResource(
	schema: Schema,
	resource: unknown,
	options?: { validator?: Ajv },
): DefinedError[];

/**
 * Validates a query result
 * @param schema - The schema to validate against
 * @param rootQuery - The root query
 * @param result - The resource tree to validate
 * @param options - Validation options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateQueryResult(
	schema: Schema,
	rootQuery: RootQuery,
	result: unknown,
	options?: {
		selectEngine?: SelectExpressionEngine;
		validator?: Ajv;
	},
): DefinedError[];

// === ENSURE FUNCTIONS ===

/**
 * Validates a create resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @throws If the resource is invalid
 */
export function ensureValidCreateResource(
	schema: Schema,
	resource: CreateResource,
	options?: { validator?: Ajv },
): void;

/**
 * Validates an update resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @throws If the resource is invalid
 */
export function ensureValidUpdateResource(
	schema: Schema,
	resource: UpdateResource,
	options?: { validator?: Ajv },
): void;

/**
 * Validates a delete resource operation
 * @param schema - The schema to validate against
 * @param resource - The resource to validate
 * @throws If the resource is invalid
 */
export function ensureValidDeleteResource(
	schema: Schema,
	resource: DeleteResource,
): void;

/**
 * Validates a resource tree that will be merged into a graph
 * @param schema - The schema to validate against
 * @param resource - The resource tree to validate
 * @param options - Validation options
 * @param options.validator - The validator instance to use
 * @throws If the resource tree is invalid
 */
export function ensureValidMergeResource(
	schema: Schema,
	resource: unknown,
	options?: { validator?: Ajv },
): void;

/**
 * Validates a query result
 * @param schema - The schema to validate against
 * @param rootQuery - The root query
 * @param result - The resource tree to validate
 * @param options - Validation options
 * @param options.selectEngine - Expression engine for SELECT clauses
 * @param options.validator - The validator instance to use
 * @throws If the resource tree is invalid
 */
export function ensureValidQueryResult(
	schema: Schema,
	rootQuery: RootQuery,
	result: unknown,
	options?: {
		selectEngine?: SelectExpressionEngine;
		validator?: Ajv;
	},
): void;

// === EXPORTED CONSTANTS ===

/**
 * The default AJV validator instance used by SpectraGraph
 */
export const defaultValidator: Ajv;

// === EXPRESSION ENGINE TYPES ===

/**
 * Expression engine for SELECT clauses - supports filtering, aggregation, and transformation operations
 */
export interface SelectExpressionEngine {
	/** Array of supported expression names */
	expressionNames: string[];
	/** Check if an object is a valid expression */
	isExpression(obj: any): boolean;
	/** Evaluate an expression against input data */
	apply(expression: any, data: any): any;
}

/**
 * Expression engine for WHERE clauses - supports filtering and logic operations only
 */
export interface WhereExpressionEngine {
	/** Array of supported expression names */
	expressionNames: string[];
	/** Check if an object is a valid expression */
	isExpression(obj: any): boolean;
	/** Evaluate an expression against input data */
	apply(expression: any, data: any): any;
}

/**
 * Default expression engine for SELECT clauses
 */
export const defaultSelectEngine: SelectExpressionEngine;

/**
 * Default expression engine for WHERE clauses
 */
export const defaultWhereEngine: WhereExpressionEngine;

// === ERROR CLASSES ===

/**
 * Error thrown when a store does not support a particular expression.
 * This allows stores to explicitly declare unsupported functionality
 * and enables tests to handle these cases gracefully.
 */
export class ExpressionNotSupportedError extends Error {
	name: "ExpressionNotSupportedError";
	expression: string;
	storeName: string;
	reason?: string;

	constructor(expression: string, storeName: string, reason?: string);
}

/**
 * Error thrown when a store does not support a particular operation.
 * This allows stores to explicitly declare unsupported functionality
 * and enables tests to handle these cases gracefully. This is useful
 * for stores that are readonly for instance.
 */
export class StoreOperationNotSupportedError extends Error {
	name: "StoreOperationNotSupportedError";
	operation: string;
	storeName: string;
	reason?: string;

	constructor(operation: string, storeName: string, reason?: string);
}
