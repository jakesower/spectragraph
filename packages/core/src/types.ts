/* eslint-disable max-len, no-use-before-define */

// Data
export interface ResourceRef {
  type: string;
  id: string;
}

export interface Resource extends ResourceRef {
  properties: Record<string, unknown>;
  relationships: Record<string, ResourceRef | ResourceRef[]>;
}

export interface ResourceTreeRef extends ResourceRef {
  properties: Record<string, never>;
  relationships: Record<string, never>;
}

export interface ExpandedResourceTree extends Resource {
  relationships: Record<string, ResourceTree[]>;
}

export type ResourceTree = ResourceTreeRef | ExpandedResourceTree;

export type NormalizedResources = Record<string, Record<string, Resource>>;
export type NormalizedResourceUpdates = Record<string, Record<string, Resource | null>>;

export type DataTree = Record<string, any>;

// Schema
type SchemaPropertyType = "string" | "number" | "boolean";

interface SchemaProperty {
  type: string;
  meta?: unknown;
}

interface SchemaRelationship {
  cardinality: string; // gets enforced to "one" | "many" programatically
  type: string;
  inverse?: string;
  meta?: unknown;
}

export interface SchemaResource {
  singular?: string;
  plural?: string;
  idField?: string;
  properties: Record<string, SchemaProperty>;
  relationships: Record<string, SchemaRelationship>;
  meta?: unknown;
}

export interface Schema {
  resources: Record<string, SchemaResource>;
  title?: string;
  meta?: unknown;
}

export interface CompiledSchemaProperty extends SchemaProperty {
  name: string;
  type: SchemaPropertyType;
}

export interface CompiledSchemaRelationship<S extends Schema> {
  cardinality: "one" | "many";
  name: string;
  inverse?: string;
  type: keyof S["resources"];
}

type CompiledSchemaAttribute<S extends Schema> = CompiledSchemaProperty | CompiledSchemaRelationship<S>;
type CompiledSchemaAttributeObj<S extends Schema> = Record<string, CompiledSchemaAttribute<S>>;

export interface CompiledSchemaResource<S extends Schema, ResName extends keyof S["resources"]> {
  attributes: CompiledSchemaAttributeObj<S>;
  attributesArray: CompiledSchemaAttribute<S>[];
  name: keyof S["resources"];
  idField: string;
  properties: Record<string, CompiledSchemaProperty>;
  propertiesArray: CompiledSchemaProperty[];
  propertyNames: (keyof S["resources"][ResName]["properties"])[];
  propertyNamesSet: Set<string>;
  relationships: Record<string, CompiledSchemaRelationship<S>>;
  relationshipsArray: CompiledSchemaRelationship<S>[];
  relationshipsByType: Record<string, CompiledSchemaRelationship<S>>;
  relationshipNames: string[];
  relationshipNamesSet: Set<string>;
}

export interface CompiledSchema<S extends Schema> {
  resources: {
    [ResName in keyof S["resources"]]: CompiledSchemaResource<S, ResName>;
  }
}

// Queries
export interface QueryParams {
  $first?: boolean;
  $id?: string;
  $not?: QueryParams;
  [k: string]: QueryParams | string | number | boolean;
}

export interface QueryRelationship {
  properties?: string[];
  relationships?: Record<string, QueryRelationship>;
  referencesOnly?: boolean;
  params?: Record<string, QueryParams>;
}

export interface QueryWithoutId {
  type: string;
  properties?: string[];
  referencesOnly?: boolean;
  relationships?: Record<string, QueryRelationship>;
  params?: Record<string, QueryParams>;
}

export interface QueryWithId extends QueryWithoutId {
  id: string;
}

export type Query = QueryWithId | QueryWithoutId;

type CompiledExpandedQuery = {
  id: string | null;
  type: string;
  properties: string[];
  referencesOnly: false;
  relationships: Record<string, CompiledQuery>;
}

type CompiledRefQuery = {
  id: string | null;
  type: string;
  referencesOnly: true;
}

export type CompiledQuery = CompiledExpandedQuery | CompiledRefQuery;

type GetOneFn = (query: QueryWithId, params?: QueryParams) => Promise<DataTree>;
type GetManyFn = (query: QueryWithoutId, params?: QueryParams) => Promise<DataTree[]>;

export type GetFn = GetOneFn & GetManyFn;

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore {
  // TODO: distinguish queries returning one vs many results
  get: GetFn;
  replaceOne: (query: Query, tree: DataTree, params?: QueryParams) => Promise<NormalizedResources>;
  replaceMany: (query: Query, trees: DataTree[], params?: QueryParams) => Promise<NormalizedResources>;
}

// Memory Store: TODO: separate package
export interface MemoryStore extends PolygraphStore {
  replaceResources: (resources: NormalizedResources) => Promise<NormalizedResources>;
}
