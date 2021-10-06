/* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

// ----Helpers-------------------------------------------------------------------------------------
export type OneOf<T> = T[keyof T];
export type KeyRecord<T> = {
  [K in keyof T]: T[K]
}
type WithCardinality<T, U extends ("one" | "many")> = U extends "many" ? T[] : T;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
export type Expand<T> = T extends Primitive ? T : { [K in keyof T]: T[K] };
type Equals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false;

export type KnownProperties<T> = {
  [P in keyof T as string extends P ? never : number extends P ? never : P]: T[P]
}

export type StringPropertyType<T> = (
  string extends keyof T
    ? T extends { [k: string]: infer U }
      ? U
      : never
    : never
)

// type CombinedStringKeys<T, U> = (
//   Equals<StringPropertyType<T>, never> extends true
//     ? Equals<StringPropertyType<U>, never> extends true
//       ? Record<string, never>
//       : Record<string, StringPropertyType<U>>
//     : Equals<StringPropertyType<U>, never> extends true
//       ? Record<string, StringPropertyType<T>>
//         : Equals<StringPropertyType<T>, StringPropertyType<U>> extends true
//           ? Record<string, StringPropertyType<T>>
//           : Record<string, StringPropertyType<T> | StringPropertyType<U>>
// )
export type CombinedStringKeys<T, U> = Record<string, StringPropertyType<T> | StringPropertyType<U>>

type NumberPropertyType<T> = (
  number extends keyof T
    ? T extends { [k: number]: infer U }
      ? U
      : never
    : never
)

type CombinedNumberKeys<T, U> = (
  Equals<NumberPropertyType<T>, never> extends true
    ? Equals<NumberPropertyType<U>, never> extends true
      ? {}
      : Record<number, NumberPropertyType<U>>
    : Equals<NumberPropertyType<U>, never> extends true
      ? Record<number, NumberPropertyType<T>>
        : Equals<NumberPropertyType<T>, NumberPropertyType<U>> extends true
          ? Record<number, NumberPropertyType<T>>
          : Record<number, NumberPropertyType<T> | NumberPropertyType<U>>
)

export type Union<T extends Record<string, any>, U extends Record<string, any>> = Expand<(
  KnownProperties<T>
  & KnownProperties<U>
  & CombinedStringKeys<T, U>
  // & CombinedNumberKeys<T, U>
)>;

export type UnionAll<T extends any[]> = (
  T extends [infer Head, ...infer Tail]
    ? Tail extends [any, ...any[]]
      ? Union<Head, UnionAll<Tail>>
      : Head
    : never
);

// ----Schema--------------------------------------------------------------------------------------
type SchemaPropertyType = "string" | "number" | "boolean";

export interface SchemaProperty {
  type: "string" | "number" | "boolean" | string;
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
  resources: Readonly<Record<string, SchemaResource>>;
  title?: string;
  meta?: unknown;
}

// ----Compiled Schema-----------------------------------------------------------------------------
export type CompiledSchemaProperties<S extends Schema, ResType extends keyof S["resources"]> = {
  [PropType in keyof S["resources"][ResType]["properties"]]: {
    name: PropType;
    type: SchemaPropertyType;
  }
}

// export type CompiledSchemaRelationshipsGeneric<S extends Schema> = Record<string, any>;
export type CompiledSchemaRelationshipsGeneric<S extends Schema> = Record<
  any,
  {
    cardinality: "one" | "many";
    name: string;
    inverse?: string;
    type: keyof S["resources"] & string;
  }
>;
export type CompiledSchemaRelationships<S extends Schema, ResType extends keyof S["resources"]> = (
  // CompiledSchemaRelationshipsGeneric<S> &
  {
    [RelType in keyof S["resources"][ResType]["relationships"]]: {
      cardinality: "one" | "many";
      name: RelType & string;
      inverse?: string;
      type: S["resources"][ResType]["relationships"][RelType]["type"] & keyof S["resources"] & string;
    }
  }
)

export interface CompiledSchemaResourceGeneric<S extends Schema> {
  name: keyof S["resources"];
  idField: string;
  properties: Record<string, any>;
  propertiesArray: any;
  propertyNames: string[];
  propertyNamesSet: Set<string>;
  relationships: CompiledSchemaRelationshipsGeneric<S>;
  relationshipsArray: CompiledSchemaRelationshipsGeneric<S>[];
  relationshipsByType: CompiledSchemaRelationshipsGeneric<S>;
  relationshipNames: string[];
  relationshipNamesSet: Set<string>;
}
export type CompiledSchemaResource<S extends Schema, ResType extends keyof S["resources"]> = (
  // CompiledSchemaResourceGeneric<S> &
  {
    name: keyof S["resources"];
    idField: keyof S["resources"][ResType]["properties"];
    properties: CompiledSchemaProperties<S, ResType>;
    propertiesArray: OneOf<CompiledSchemaProperties<S, ResType>>[];
    propertyNames: (keyof S["resources"][ResType]["properties"])[];
    propertyNamesSet: Set<keyof S["resources"][ResType]["properties"]>;
    relationships: CompiledSchemaRelationships<S, ResType>// & CompiledSchemaRelationshipsGeneric<S>;
    relationshipsArray: OneOf<CompiledSchemaRelationships<S, ResType>>[];
    relationshipNames: (keyof S["resources"][ResType]["relationships"])[];
    relationshipNamesSet: Set<keyof S["resources"][ResType]["relationships"]>;
  }
)

export type CompiledSchema<S extends Schema> = {
  resources: Readonly<{
    [ResType in keyof S["resources"]]: CompiledSchemaResource<S, ResType>;
  }>
}

// ----Queries-------------------------------------------------------------------------------------
// export interface QueryParams {
//   $first?: boolean;
//   $id?: string;
//   $not?: QueryParams;
//   [k: string]: QueryParams | string | number | boolean;
// }

// export interface SubQuery {
//   properties?: string[];
//   relationships?: Record<string, SubQuery>;
//   referencesOnly?: boolean;
//   params?: Record<string, QueryParams>;
// }

// export interface QueryWithoutId {
//   type: string;
//   properties?: string[];
//   referencesOnly?: boolean;
//   relationships?: Record<string, SubQuery>;
//   params?: Record<string, QueryParams>;
// }

// export interface QueryWithId extends QueryWithoutId {
//   id: string;
// }

// export type Query = QueryWithId | QueryWithoutId;
export type QueryParams<CS extends CompiledSchema<any>> = {
  $first?: boolean;
  $id?: string;
  $not?: QueryParams<CS>;
  [k: string]: QueryParams<CS> | string | number | boolean;
}

// TODO: expand with ResType
export type SubQuery<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = {
  properties?: (keyof CS["resources"][ResType]["properties"])[];
  relationships?: {
    [RelType in keyof CS["resources"][ResType]["relationships"]]:
      SubQuery<CS, CS["resources"][ResType]["relationships"][RelType]["type"]>
  }
  referencesOnly?: boolean;
  params?: Record<string, QueryParams<CS>>;
}

export type QueryWithoutId<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  SubQuery<CS, ResType> & { type: ResType }
);

export type QueryWithId<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  QueryWithoutId<CS, ResType> & { id: string }
);

export type Query<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  QueryWithId<CS, ResType> | QueryWithoutId<CS, ResType>
);

export type CompiledRefSubQuery<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = Readonly<{
  type: ResType;
  referencesOnly: true;
}>;

export type CompiledExpandedSubQuery<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = {
  type: ResType;
  properties: (keyof CS["resources"][ResType]["properties"])[];
  referencesOnly: false;
  relationships: Partial<{
    [RelType in keyof CS["resources"][ResType]["relationships"]]:
      CompiledSubQuery<CS, CS["resources"][ResType]["relationships"][RelType]["type"]>
  }>
};

export type CompiledSubQuery<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  CompiledExpandedSubQuery<CS, ResType> | CompiledRefSubQuery<CS, ResType>
)
export type CompiledQuery<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  { id: string | null } & CompiledSubQuery<CS, ResType>
)

// ----Query Results-------------------------------------------------------------------------------
export type DataTree = Record<string, any>;

// TODO: working with all properties supplied explicitly; expand it
type ResourcePropertyTypeOf<K extends SchemaPropertyType> = (
  K extends "string" ? string
    : K extends "number" ? number
    : K extends "boolean" ? boolean
    : never
);
export type QueryResultProperties<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  {
    [PropType in keyof CS["resources"][ResType]["properties"]]:
      ResourcePropertyTypeOf<CS["resources"][ResType]["properties"][PropType]["type"]>;
  }
);

// type QueryResultRelationships<S extends Schema, ResType extends keyof S["resources"]> = (
//   {
//     [RelType in keyof S["resources"][ResType]["relationships"]]: WithCardinality<
//       QueryResult<S, S["resources"][ResType]["relationships"][RelType]["type"]>,
//       S["resources"][ResType]["relationships"][RelType]["cardinality"]
//     >
//   }
// );

export type QueryResult<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
  null
  | (
      { type: ResType; id: string; }
      & Partial<UnionAll<[
        { type: ResType; id: string; },
        QueryResultProperties<CS, ResType>,
        // & QueryResultRelationships<S, ResType>
      ]>>
  )
);

// ----Resources-----------------------------------------------------------------------------------
export type ResourceRef<S extends Schema> = Readonly<{
  type: keyof S["resources"];
  id: string;
}>

export type ResourceRefOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{ type: ResType, id: string }>
)

type ResourceGeneric<S extends Schema> = {
  type: keyof S["resources"] & string;
  id: string;
  properties: Record<string, any>;
  relationships: Record<string, ResourceRef<S> | ResourceRef<S>[]>;
}

export type ResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  {
    type: ResType;
    id: string;
    properties: Record<keyof S["resources"][ResType]["properties"], any>;
    relationships: {
      [RelType in keyof S["resources"][ResType]["relationships"]]:
        ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>
        | ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
    }
  }
);

// export type CompiledResourceOfType<CS extends CompiledSchema<any>, ResType extends keyof CS["resources"]> = (
//   ResourceOfType<CS, ResType>
// );

// export type ResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = ResourceGeneric<S> & {
//   type: ResType;
//   id: string;
//   properties: Record<keyof S["resources"][ResType]["properties"], any>;
//   relationships: Record<
//     keyof S["resources"][ResType]["relationships"],
//     ResourceRef<S> | ResourceRef<S>[]
//   >;
// }

// export type Resource<S extends Schema> = { [ResType in keyof S["resources"]]: ResourceOfType<S, ResType> }[ResType];

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
    relationships: Record<
      keyof S["resources"][ResType]["relationships"],
      ResourceRefOfType<S, ResType> | (ResourceRefOfType<S, ResType>)[]
    >;
  }
}>

export type ResourceTree<S extends Schema> = ResourceTreeRef<S> | ExpandedResourceTree<S>;

export type ExpandedResourceTreeOfType<S extends Schema, ResType extends keyof S["resources"]> = {
  type: ResType;
  id: string;
  properties: Record<keyof S["resources"][ResType]["properties"], unknown>;
  relationships: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>
      | ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
  }>;
}

export type ResourceTreeRefOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  ResourceRefOfType<S, ResType> &
  {
    properties: Record<string, never>;
    relationships: Record<string, never>;
  }
)

export type ResourceTreeOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  ResourceTreeRefOfType<S, ResType> | ExpandedResourceTreeOfType<S, ResType>
);

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
      relationships?: Partial<{
        [RelType in keyof S["resources"][ResType]["relationships"]]:
          ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>
          | ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
      }>;
    }>;
};

type GetOneFn<CS extends CompiledSchema<any>> = <ResType extends keyof CS["resources"]>(
  query: QueryWithId<CS, ResType>,
  params?: QueryParams<CS>
) => Promise<QueryResult<CS, ResType>>;
type GetManyFn<CS extends CompiledSchema<any>> = <ResType extends keyof CS["resources"]>(
  query: QueryWithoutId<CS, ResType>,
  params?: QueryParams<CS>
) => Promise<QueryResult<CS, ResType>[]>;

export type GetFn<CS extends CompiledSchema<any>> = GetOneFn<CS> & GetManyFn<CS>;

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore<S extends Schema> {
  // TODO: distinguish queries returning one vs many results
  // get: GetFn<S>;
  get: <CS extends CompiledSchema<S>, ResType extends keyof CS["resources"]>(
    query: Query<CS, ResType>,
    params?: QueryParams<CS>
  ) => Promise<QueryResult<CS, ResType>>,

  replaceOne: <CS extends CompiledSchema<S>, ResType extends keyof CS["resources"]>(
    query: Query<CS, ResType>,
    tree: DataTree,
    params?: QueryParams<CS>
  ) => Promise<NormalizedResourceUpdates<S>>;

  replaceMany: <CS extends CompiledSchema<S>, ResType extends keyof CS["resources"]>(
    query: Query<CS, ResType>,
    trees: DataTree[],
    params?: QueryParams<CS>
  ) => Promise<NormalizedResourceUpdates<S>>;
}

// Memory Store: TODO: separate package
export interface MemoryStore<S extends Schema> extends PolygraphStore<S> {
  replaceResources: (resources: NormalizedResources<S>) => Promise<NormalizedResourceUpdates<S>>;
}
