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
  type: SchemaPropertyType;
  meta?: unknown;
}

interface SchemaRelationship {
  cardinality: "one" | "many";
  type: string;
  inverse?: string;
  meta?: unknown;
}

interface SchemaResource {
  singular: string;
  plural: string;
  idField?: string;
  properties: {
    [k: string]: SchemaProperty;
  };
  relationships: {
    [k: string]: SchemaRelationship;
  };
  meta?: unknown;
}

export interface Schema {
  resources: { [k: string]: SchemaResource };
  title?: string;
  meta?: unknown;
}

export interface CompiledSchemaProperty extends SchemaProperty {
  name: string;
}

export interface CompiledSchemaRelationship extends SchemaRelationship {
  name: string;
}

type CompiledSchemaAttribute = CompiledSchemaProperty | CompiledSchemaRelationship;
type CompiledSchemaAttributeObj = { [k: string]: CompiledSchemaAttribute };

export interface CompiledSchemaResource extends SchemaResource {
  attributes: CompiledSchemaAttributeObj;
  attributesArray: CompiledSchemaAttribute[];
  name: string;
  idField: string;
  properties: { [k: string]: CompiledSchemaProperty };
  propertiesArray: CompiledSchemaProperty[];
  propertyNames: string[];
  propertyNamesSet: Set<string>;
  relationships: { [k: string]: CompiledSchemaRelationship };
  relationshipsArray: CompiledSchemaRelationship[];
  relationshipsByType: Record<string, CompiledSchemaRelationship>;
  relationshipNames: string[];
  relationshipNamesSet: Set<string>;
}

export interface CompiledSchema {
  resources: Record<string, CompiledSchemaResource>;
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
