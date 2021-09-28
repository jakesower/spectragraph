/* eslint-disable max-len, no-use-before-define */

// Helpers
export type OneOf<T> = T[keyof T];
export type KeyRecord<T> = {
  [K in keyof T]: T[K]
}

// Data
export type ResourceRef<S extends Schema> = Readonly<{
  type: keyof S["resources"];
  id: string;
}>

export type ResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = {
  type: ResType;
  id: string;
  properties: Record<keyof S["resources"][ResType]["properties"], unknown>;
  relationships: Record<keyof S["resources"][ResType]["relationships"], ResourceRef<S> | ResourceRef<S>[]>;
}

export type Resource<S extends Schema> = OneOf<{
  [ResType in keyof S["resources"]]: {
    type: ResType;
    id: string;
    properties: Record<keyof S["resources"][ResType]["properties"], unknown>;
    relationships: Record<keyof S["resources"][ResType]["relationships"], ResourceRef<S> | ResourceRef<S>[]>;
  }
}>;

export interface ResourceTreeRef<S extends Schema> extends ResourceRef<S> {
  properties: Record<string, never>;
  relationships: Record<string, never>;
}

// same as Resource<S>?
export type ExpandedResourceTree<S extends Schema> = OneOf<{
  [ResType in keyof S["resources"]]: {
    type: ResType;
    id: string;
    properties: Record<keyof S["resources"][ResType]["properties"], unknown>;
    relationships: Record<keyof S["resources"][ResType]["relationships"], ResourceRef<S> | ResourceRef<S>[]>;
  }
}>

export type ExpandedResourceTreeOfType<S extends Schema, ResType extends keyof S["resources"]> = {
  type: ResType;
  id: string;
  properties: Record<keyof S["resources"][ResType]["properties"], unknown>;
  relationships: Record<keyof S["resources"][ResType]["relationships"], ResourceRef<S> | ResourceRef<S>[]>;
}

export type ResourceTree<S extends Schema> = ResourceTreeRef<S> | ExpandedResourceTree<S>;

export type NormalizedResources<S extends Schema> = {
  [ResType in keyof S["resources"]]: Record<string, ResourceOfType<S, ResType>>;
}
export type NormalizedResourceUpdates<S extends Schema> = {
  [ResType in keyof S["resources"]]:
    null |
    Record<string, {
      type: ResType;
      id: string;
      properties?: Partial<Record<keyof S["resources"][ResType]["properties"], unknown>>;
      relationships?: Partial<Record<keyof S["resources"][ResType]["relationships"], ResourceRef<S> | ResourceRef<S>[]>>;
      }
    >;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTree = Record<string, any>;

// Schema
type SchemaPropertyType = "string" | "number" | "boolean";

export interface SchemaProperty {
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

export type CompiledSchemaProperties<S extends Schema, ResType extends keyof S["resources"]> = {
  [PropType in keyof S["resources"][ResType]["properties"]]: {
    name: PropType;
    type: SchemaPropertyType;
  }
}

export type CompiledSchemaRelationships<S extends Schema, ResType extends keyof S["resources"]> = {
  [RelType in keyof S["resources"][ResType]["relationships"]]: {
    cardinality: "one" | "many";
    name: RelType;
    inverse?: string;
    type: keyof S["resources"][ResType]["relationships"][RelType]["type"] & keyof S["resources"] & string;
  }
}

// type CompiledSchemaAttribute<S extends Schema> = CompiledSchemaProperty | CompiledSchemaRelationship<S>;
// type CompiledSchemaAttributeObj<S extends Schema> = Record<string, CompiledSchemaAttribute<S>>;

export interface CompiledSchemaResource<S extends Schema, ResType extends keyof S["resources"]> {
  // attributes: CompiledSchemaAttributeObj<S>;
  // attributesArray: CompiledSchemaAttribute<S>[];
  name: keyof S["resources"];
  idField: keyof S["resources"][ResType]["properties"];
  properties: CompiledSchemaProperties<S, ResType>;
  propertiesArray: OneOf<CompiledSchemaProperties<S, ResType>>[];
  propertyNames: (keyof S["resources"][ResType]["properties"])[];
  propertyNamesSet: Set<keyof S["resources"][ResType]["properties"]>;
  relationships: CompiledSchemaRelationships<S, ResType>;
  relationshipsArray: OneOf<CompiledSchemaRelationships<S, ResType>>[];
  relationshipsByType: Record<string, CompiledSchemaRelationships<S, ResType>>;
  relationshipNames: (keyof S["resources"][ResType]["relationships"])[];
  relationshipNamesSet: Set<keyof S["resources"][ResType]["relationships"]>;
}

export interface CompiledSchema<S extends Schema> {
  resources: {
    [ResType in keyof S["resources"]]: CompiledSchemaResource<S, ResType>;
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

export type CompiledExpandedQuery<S extends Schema, ResType extends keyof S["resources"]> = {
  id: string | null;
  type: ResType;
  properties: (keyof S["resources"][ResType]["properties"])[];
  referencesOnly: false;
  relationships: {
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      CompiledQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }
};

export type CompiledRefQuery<S extends Schema, ResType extends keyof S["resources"]> = {
  id: string | null;
  type: ResType;
  referencesOnly: true;
};

// export type CompiledQuery<S extends Schema> = CompiledExpandedQuery<S> | CompiledRefQuery<S>;
export type CompiledQuery<S extends Schema, ResType extends keyof S["resources"]> = (
  CompiledExpandedQuery<S, ResType> | CompiledRefQuery<S, ResType>
)

type GetOneFn = (query: QueryWithId, params?: QueryParams) => Promise<DataTree>;
type GetManyFn = (query: QueryWithoutId, params?: QueryParams) => Promise<DataTree[]>;

export type GetFn = GetOneFn & GetManyFn;

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore<S extends Schema> {
  // TODO: distinguish queries returning one vs many results
  get: GetFn;
  replaceOne: (query: Query, tree: DataTree, params?: QueryParams) => Promise<NormalizedResourceUpdates<S>>;
  replaceMany: (query: Query, trees: DataTree[], params?: QueryParams) => Promise<NormalizedResourceUpdates<S>>;
}

// Memory Store: TODO: separate package
export interface MemoryStore<S extends Schema> extends PolygraphStore<S> {
  replaceResources: (resources: NormalizedResources<S>) => Promise<NormalizedResourceUpdates<S>>;
}
