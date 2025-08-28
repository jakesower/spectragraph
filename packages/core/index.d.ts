// TypeScript definitions for @data-prism/core
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

// === COMPARATIVE EXPRESSIONS ===

export interface EqualExpression {
	$eq: unknown;
}

export interface GreaterThanExpression {
	$gt: number;
}

export interface GreaterThanOrEqualExpression {
	$gte: number;
}

export interface LessThanExpression {
	$lt: number;
}

export interface LessThanOrEqualExpression {
	$lte: number;
}

export interface NotEqualExpression {
	$ne: unknown;
}

export interface InExpression {
	$in: unknown[];
}

export interface NotInExpression {
	$nin: unknown[];
}

/**
 * Regular expression matching expression.
 * Tests if a string matches a regex pattern.
 * 
 * Supports inline flags using the syntax (?flags)pattern where flags can be:
 * - i: case insensitive matching
 * - m: multiline mode (^ and $ match line boundaries)  
 * - s: dotall mode (. matches newlines)
 * 
 * @example
 * { name: { $matchesRegex: "^[A-Z].*" } } // Names starting with capital letter
 * { email: { $matchesRegex: "(?i).*@example\\.com$" } } // Case-insensitive email check
 */
export interface MatchesRegexExpression {
	$matchesRegex: string;
}

/**
 * SQL LIKE pattern matching expression.
 * Tests if a string matches a SQL LIKE pattern.
 * 
 * Supports SQL standard patterns:
 * - % matches any sequence of characters (including none)
 * - _ matches exactly one character
 * - Case-sensitive matching (consistent across databases)
 * 
 * @example
 * { name: { $matchesLike: "John%" } } // Names starting with "John"
 * { email: { $matchesLike: "%@gmail.com" } } // Gmail addresses
 * { code: { $matchesLike: "A_B_" } } // Codes like "A1B2", "AXBY"
 */
export interface MatchesLikeExpression {
	$matchesLike: string;
}

/**
 * Unix shell GLOB pattern matching expression.
 * Tests if a string matches a Unix shell GLOB pattern.
 * 
 * Supports Unix shell patterns:
 * - * matches any sequence of characters (including none)
 * - ? matches exactly one character  
 * - [chars] matches any single character in the set
 * - [!chars] or [^chars] matches any character not in the set
 * - Case-sensitive matching
 * 
 * @example
 * { filename: { $matchesGlob: "*.txt" } } // Text files
 * { name: { $matchesGlob: "[A-Z]*" } } // Names starting with capital
 * { code: { $matchesGlob: "IMG_[0-9][0-9][0-9][0-9]" } } // Image codes
 */
export interface MatchesGlobExpression {
	$matchesGlob: string;
}

export interface Query {
	id?: string;
	limit?: number;
	offset?: number;
	order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
	select:
		| readonly (string | { [k: string]: string | Query | Expression })[]
		| { [k: string]: string | Query | Expression }
		| "*";
	type?: string;
	where?: { [k: string]: unknown };
}

export interface RootQuery extends Query {
	type: string;
}

export interface NormalQuery extends Query {
	select: { [k: string]: string | NormalQuery | Expression };
	order?: { [k: string]: "asc" | "desc" }[];
	type: string;
}

// === RESOURCE TYPES ===

export interface Ref {
	type: string;
	id: string;
}

export interface BaseResource {
	type: string;
}

export interface NormalResource extends BaseResource {
	id: string;
	attributes: { [k: string]: unknown };
	relationships: { [k: string]: Ref | Ref[] | null };
}

export interface PartialNormalResource extends BaseResource {
	id?: string;
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

// === GRAPH TYPES ===

export interface Graph {
	[resourceType: string]: { [resourceId: string]: NormalResource };
}

export interface QueryGraph {
	query(query: RootQuery): unknown;
}

// === RESULT TYPES ===

export type QueryResult = { [k: string]: unknown };

// === STORE TYPES ===

/**
 * Generic store interface for data persistence
 */
export interface Store {
	/**
	 * Creates a new resource
	 */
	create(resource: CreateResource): Promise<NormalResource>;
	
	/**
	 * Updates an existing resource
	 */
	update(resource: UpdateResource): Promise<NormalResource>;
	
	/**
	 * Deletes a resource
	 */
	delete(resource: DeleteResource): Promise<DeleteResource>;
	
	/**
	 * Creates or updates a resource
	 */
	upsert(resource: CreateResource | UpdateResource): Promise<NormalResource>;
	
	/**
	 * Queries the store
	 */
	query(query: RootQuery): Promise<QueryResult>;
}

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
 * @param options.expressionEngine - Custom expression engine
 * @param options.validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateQuery(
	schema: Schema,
	query: RootQuery,
	options?: { expressionEngine?: unknown; validator?: Ajv },
): DefinedError[];

/**
 * Validates that a query is valid against the schema
 * @param schema - The schema object
 * @param query - The query to validate
 * @param options - Validation options
 * @param options.expressionEngine - Custom expression engine
 * @param options.validator - The validator instance to use
 * @throws If the query is invalid
 */
export function ensureValidQuery(
	schema: Schema,
	query: RootQuery,
	options?: { expressionEngine?: unknown; validator?: Ajv },
): void;

/**
 * Normalizes a query by expanding shorthand syntax and ensuring consistent structure
 * @param schema - The schema object
 * @param rootQuery - The query to normalize
 * @returns The normalized query
 */
export function normalizeQuery(
	schema: Schema,
	rootQuery: RootQuery,
): NormalQuery;

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
 * @returns Merged graph with resources merged using mergeResources
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
 * @returns Query result
 */
export function queryGraph(
	schema: Schema,
	query: RootQuery,
	graph: Graph,
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
export function mergeResources(
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
 * @param options.validator - The validator instance to use
 * @returns Array of validation errors
 */
export function validateQueryResult(
	schema: Schema,
	rootQuery: RootQuery,
	result: unknown,
	options?: { validator?: Ajv },
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
 * @param options.validator - The validator instance to use
 * @throws If the resource tree is invalid
 */
export function ensureValidQueryResult(
	schema: Schema,
	rootQuery: RootQuery,
	result: unknown,
	options?: { validator?: Ajv },
): void;

// === EXPORTED CONSTANTS ===

export const defaultValidator: Ajv;
