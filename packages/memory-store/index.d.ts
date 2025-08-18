// Main data-prism TypeScript definitions

// Schema types
export interface SchemaAttribute {
  type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null" |
        "date" | "time" | "date-time" | "iso-time" | "iso-date-time" | "duration" |
        "uri" | "uri-reference" | "uri-template" | "url" | "email" | "hostname" |
        "ipv4" | "ipv6" | "regex" | "uuid" | "json-pointer" | "relative-json-pointer" |
        "byte" | "int32" | "int64" | "float" | "double" | "password" | "binary" |
        "data-prism:geojson" | "data-prism:geojson-point";
  title?: string;
  description?: string;
  default?: unknown;
  $comment?: string;
  deprecated?: boolean;
  meta?: unknown;
  required?: boolean;
  subType?: string;
  [k: string]: unknown;
}

export interface SchemaRelationship {
  type: string;
  cardinality: "one" | "many";
  inverse?: string;
  required?: boolean;
}

export interface SchemaResource {
  idAttribute?: string;
  attributes: { [k: string]: SchemaAttribute };
  relationships: { [k: string]: SchemaRelationship };
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

// Query types
export interface Expression {
  [k: string]: unknown;
}

export interface Query {
  id?: string;
  limit?: number;
  offset?: number;
  order?: { [k: string]: "asc" | "desc" } | { [k: string]: "asc" | "desc" }[];
  select: readonly (string | { [k: string]: string | Query | Expression })[] | 
          { [k: string]: string | Query | Expression } | "*";
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

export interface NormalRootQuery extends RootQuery, NormalQuery {}

export interface QueryInfo {
  path: string[];
  parent: Query | null;
  type: string;
}

// Graph types
export interface Ref {
  type: string;
  id: string;
}

export interface NormalResource {
  id: string;
  type: string;
  attributes: { [k: string]: unknown };
  relationships: { [k: string]: Ref | Ref[] | null };
}

export type Graph = {
  [k: string]: { [k: string]: NormalResource };
};

export interface NormalResourceTree {
  type: string;
  id?: string;
  attributes?: { [k: string]: unknown };
  relationships?: {
    [k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
  };
}

// Validation types
export interface CreateResource {
  type: string;
  id?: number | string;
  attributes?: { [k: string]: unknown };
  relationships?: { [k: string]: Ref | Ref[] | null };
}

export interface UpdateResource {
  type: string;
  id: number | string;
  attributes?: { [k: string]: unknown };
  relationships?: { [k: string]: Ref | Ref[] | null };
}

export type DeleteResource = Ref;

export interface MemoryStoreConfig {
  initialData?: Graph;
  validator?: any; // Ajv instance
}

// Query result types
export interface Result {
  [k: string]: unknown;
}

// Schema functions
export function ensureValidSchema(schema: any): void;

// Query functions
export function ensureValidQuery(schema: any, query: RootQuery): void;
export function normalizeQuery(schema: Schema, rootQuery: RootQuery): NormalRootQuery;
export function forEachQuery<S extends Schema>(
  schema: S,
  query: RootQuery,
  fn: (subquery: Query, info: any) => unknown
): void;
export function mapQuery<S extends Schema>(
  schema: S,
  query: RootQuery,  
  fn: (subquery: NormalQuery, info: any) => unknown
): any;
export function reduceQuery<S extends Schema, T>(
  schema: S,
  query: RootQuery,
  fn: (acc: T, subquery: NormalQuery, info: any) => T,
  init: T
): T;

// Schemaless query functions
export function forEachSchemalessQuery(
  query: any,
  fn: (subquery: any, info: any) => unknown
): void;
export function mapSchemalessQuery(
  query: any,
  fn: (subquery: any, info: any) => unknown
): any;
export function reduceSchemalessQuery<T>(
  query: any,
  fn: (acc: T, subquery: any, info: any) => T,
  init: T
): T;

// Graph functions
export function createEmptyGraph(schema: Schema): Graph;
export function linkInverses(graph: Graph, schema: Schema): Graph;
export function mergeGraphs(left: Graph, right: Graph): Graph;
export function createQueryGraph(graph: Graph): any;
export function queryGraph(graph: Graph, query: RootQuery): Result;

// Mapper functions
export function flattenResource(
  resourceId: any,
  resource: any,
  idAttribute?: string
): any;
export function normalizeResource(
  resourceType: string,
  resource: { [k: string]: unknown },
  schema: Schema,
  graphMappers?: any
): NormalResource;
export function createGraphFromTrees(
  schema: Schema,
  trees: NormalResourceTree[]
): Graph;

// Memory store functions
export function createMemoryStore(
  schema: Schema,
  config?: MemoryStoreConfig
): {
  query: (query: RootQuery) => Result;
  create: (resource: CreateResource | NormalResourceTree) => NormalResource;
  update: (resource: UpdateResource | NormalResourceTree) => NormalResource;
  upsert: (resource: CreateResource | UpdateResource | NormalResourceTree) => NormalResource;
  delete: (resource: DeleteResource) => DeleteResource;
  merge: (resource: NormalResourceTree) => NormalResourceTree;
  getOne: (type: string, id: string) => NormalResource | null;
  linkInverses: () => void;
};

// Validation functions
export function createValidator(options?: { ajvSchemas?: any[] }): any;
export function validateCreateResource(
  schema: Schema,
  resource: CreateResource,
  validator?: any
): any[];
export function validateUpdateResource(
  schema: Schema,
  resource: UpdateResource,
  validator?: any
): any[];
export function validateDeleteResource(
  schema: Schema,
  resource: DeleteResource,
  validator?: any
): any[];
export function validateResourceTree(
  schema: Schema,
  resource: NormalResourceTree,
  validator?: any
): any[];