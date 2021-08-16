/* eslint-disable max-len */

// Data
export interface ResourceRef {
  type: string;
  id: string;
}

export interface Resource extends ResourceRef {
  properties: Record<string, unknown>;
  relationships: Record<string, ResourceRef[]>;
}

export interface ResourceTree extends Resource {
  relationships: Record<string, ResourceTree[]>;
}

export type NormalizedResources = Record<string, Record<string, Resource>>;
export type NormalizedResourceUpdates = Record<string, Record<string, Resource | null>>;

export type DataTree = Record<string, unknown>;

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
  params?: Record<string, QueryParams>;
}

export interface Query {
  id?: string;
  type: string;
  properties?: string[];
  relationships?: Record<string, QueryRelationship>;
  params?: Record<string, QueryParams>;
}

export type CompiledQuery = {
  id: string | null; // it's a PITA not to have this
  type: string;
  properties: string[];
  relationships: Record<string, CompiledQuery>;
}

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore {
  // TODO: distinguish queries returning one vs many results
  get: (query: Query, params?: QueryParams) => Promise<DataTree | DataTree[]>;
  replaceOne: (query: Query, tree: DataTree, params?: QueryParams) => Promise<NormalizedResourceUpdates>;
  replaceMany: (query: Query, trees: DataTree[], params?: QueryParams) => Promise<NormalizedResourceUpdates>;
}

// Memory Store: TODO: separate package
export interface MemoryStore extends PolygraphStore {
  replaceResources: (resources: NormalizedResources) => Promise<NormalizedResources>;
}
