/* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

// ----Helpers-------------------------------------------------------------------------------------
export type OneOf<T> = T[keyof T];
export type ArrayToUnion<T extends readonly any[]> = (
  T extends readonly [infer Head, ...infer Tail]
    ? Tail extends readonly [any, ...any[]]
      ? Head | ArrayToUnion<Tail>
      : Head
    : T extends readonly (infer U)[]
      ? U
      : never
);
export type AsArray<T extends readonly any[]> = Readonly<(
  T extends readonly [infer U]
    ? U
    : T extends readonly [infer U, ...infer R]
      ? (U | AsArray<R>)[]
      : T
)>;
export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
export type Expand<T> = T extends Primitive ? T : { [K in keyof T]: T[K] };
export type Equals<X, Y> =
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

export type CombinedStringKeys<T, U> = Record<string, StringPropertyType<T> | StringPropertyType<U>>

export type Union<T extends Record<string, any>, U extends Record<string, any>> = Expand<(
  KnownProperties<T>
  & KnownProperties<U>
  & CombinedStringKeys<T, U>
  // & CombinedNumberKeys<T, U>
)>;

type AnyFunction = (...args: any[]) => any;
type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export type Immutable<T> = (
  T extends AnyFunction | Primitive ? T :
  T extends Array<infer U> ? ImmutableArray<U> :
  T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
  T extends Set<infer M> ? ImmutableSet<M>
  : ImmutableObject<T>
);

// ----Schema--------------------------------------------------------------------------------------
type SchemaPropertyType = "string" | "number" | "boolean";

export type Schema = Readonly<{
  title?: string;
  resources: Readonly<{
    [k: string]: Readonly<{
      singular?: string;
      plural?: string;
      idField?: string;
      properties: Readonly<{
        [k: string]: Readonly<{
          default?: any;
          optional?: boolean;
          type: SchemaPropertyType;
        }>
      }>
      relationships: Readonly<{
        [k: string]: Readonly<{
          cardinality: "one" | "many";
          type: string;
          inverse?: string;
        }>
      }>
    }>
  }>
}>;

export type ValidSchema<S extends Schema> = (
  S &
  Readonly<{
    resources: Readonly<{
      [ResType in keyof S["resources"]]: {
        relationships: Readonly<{
          [RelType in keyof S["resources"][ResType]["relationships"]]: {
            type: keyof S["resources"];
          }
        }>
      }
    }>
  }>
)

export type ExpandedSchema<S extends Schema> = (
  Readonly<{
    title?: string;
    resources: Readonly<{
      [ResType in keyof S["resources"]]: {
        properties: Readonly<{
          [PropType in keyof S["resources"][ResType]["properties"]]: {
            default?: any;
            optional?: boolean;
            type: SchemaPropertyType;
          }
        }>;
        relationships: Readonly<{
          [RelType in keyof S["resources"][ResType]["relationships"]]: {
            cardinality: "one" | "many";
            inverse?: string;
            type: S["resources"][ResType]["relationships"][RelType]["type"] & string;
          }
        }>
      }
    }>
  }>
)

export type CompiledSchema<S extends Schema> = (
  Readonly<{
    title?: string;
    resources: Readonly<{
      [ResType in keyof S["resources"]]: {
        name: ResType & string,
        idField: string;
        propertiesArray: { type: SchemaPropertyType }[];
        properties: Readonly<{
          [PropType in keyof S["resources"][ResType]["properties"]]: {
            name: PropType & string;
            type: SchemaPropertyType;
          }
        }>;
        propertyNames: string[];
        propertyNamesSet: Set<string>;
        relationshipsArray: ({
          name: string;
          cardinality: "one" | "many";
          inverse?: string;
          type: keyof S["resources"] & string;
        })[];
        relationshipNames: string[];
        relationshipNamesSet: Set<string>;
        relationships: Readonly<{
          [RelType in keyof S["resources"][ResType]["relationships"]]: {
            name: RelType & string;
            cardinality: "one" | "many";
            inverse?: string;
            type: keyof S["resources"] & string;
          }
        }>
      }
    }>
  }>
)

// ----Queries-------------------------------------------------------------------------------------
export type QueryParams<S extends Schema> = {
  $first?: boolean;
  $id?: string;
  $not?: QueryParams<S>;
  [k: string]: QueryParams<S> | string | number | boolean;
}

// TODO: expand with ResType
export type SubQuery<S extends Schema, ResType extends keyof S["resources"]> = Readonly<{
  properties?: readonly (keyof S["resources"][ResType]["properties"] & string)[];
  relationships?: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      SubQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
  referencesOnly?: boolean;
  params?: Record<string, QueryParams<S>>;
}>

export type SubQueryProps<
  S extends Schema,
  ResType extends keyof S["resources"],
  SQ extends SubQuery<S, ResType>,
> = Readonly<
  "properties" extends keyof SQ
    ? ArrayToUnion<SQ["properties"]>
    : keyof S["resources"][ResType]["properties"]
>;

export type SubQueryRels<
  S extends Schema,
  ResType extends keyof S["resources"],
  SQ extends SubQuery<S, ResType>,
> = (
  "relationships" extends keyof SQ
    ? keyof SQ["relationships"]
    : keyof S["resources"][ResType]["relationships"]
);

export type Query<S extends Schema, ResType extends keyof S["resources"]> = Readonly<{
  properties?: readonly (keyof S["resources"][ResType]["properties"] & string)[];
  relationships?: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      SubQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
  referencesOnly?: boolean;
  params?: Record<string, QueryParams<S>>;
  type: ResType & string;
  id?: string;
}>

export type QueryProps<
  S extends Schema,
  ResType extends keyof S["resources"],
  Q extends Query<S, ResType>,
> = (
  "properties" extends keyof Q
    ? ArrayToUnion<Q["properties"]>
    : keyof S["resources"][ResType]["properties"]
);

export type QueryRels<
  S extends Schema,
  ResType extends keyof S["resources"],
  Q extends Query<S, ResType>,
> = (
  "relationships" extends keyof Q
    ? keyof Q["relationships"]
    : keyof S["resources"][ResType]["relationships"]
);

export type QueryWithId<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<Query<S, ResType> & { id: string }>
);

export type CompiledRefSubQuery<S extends Schema, ResType extends keyof S["resources"]> = Readonly<{
  type: ResType & string;
  referencesOnly: true;
}>;

export type CompiledExpandedSubQuery<
  S extends Schema,
  ResType extends keyof S["resources"],
> = Readonly<{
  type: ResType & string;
  properties: readonly (keyof S["resources"][ResType]["properties"] & string)[];
  referencesOnly: false;
  relationships: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      CompiledSubQuery<
        S,
        S["resources"][ResType]["relationships"][RelType]["type"]
      >
  }>
}>;

export type CompiledSubQuery<
  S extends Schema,
  ResType extends keyof S["resources"],
> = (
  CompiledExpandedSubQuery<S, ResType> | CompiledRefSubQuery<S, ResType>
);

export type CompiledSubQueryProps<
  S extends Schema,
  ResType extends keyof S["resources"],
  CSQ extends CompiledSubQuery<S, ResType>,
> = (
  CSQ extends CompiledExpandedSubQuery<S, ResType>
    ? ArrayToUnion<CSQ["properties"]>
    : keyof {}
);

export type CompiledSubQueryRels<
  S extends Schema,
  ResType extends keyof S["resources"],
  CSQ extends CompiledSubQuery<S, ResType>,
> = (
  CSQ extends CompiledExpandedSubQuery<S, ResType>
    ? keyof CSQ["relationships"]
    : keyof {}
);

export type CompiledExpandedQuery<
  S extends Schema,
  ResType extends keyof S["resources"],
> = CompiledExpandedSubQuery<S, ResType> & Readonly<{
  type: ResType & string;
  id: string | null;
  properties: readonly (keyof S["resources"][ResType]["properties"])[];
  referencesOnly: false;
  relationships: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      CompiledSubQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
}>

export type CompiledRefQuery<S extends Schema, ResType extends keyof S["resources"]> = (
  CompiledRefSubQuery<S, ResType> &
  Readonly<{
    type: ResType;
    id: string | null;
    referencesOnly: true;
  }>
)

export type CompiledQuery<
  S extends Schema,
  ResType extends keyof S["resources"],
> = (
  CompiledExpandedQuery<S, ResType> | CompiledRefQuery<S, ResType>
)

// ----Query Results-------------------------------------------------------------------------------
export type DataTree = Record<string, any>;

type ResourcePropertyTypeOf<K extends SchemaPropertyType> = (
  K extends "string" ? string
    : K extends "number" ? number
    : K extends "boolean" ? boolean
    : never
);

// TODO: Flesh out what happens when using non-const schema
export type QueryResultResource<
  S extends Schema,
  ResType extends keyof S["resources"],
  PropTypes extends keyof S["resources"][ResType]["properties"] = keyof S["resources"][ResType]["properties"],
  RelTypes extends keyof S["resources"][ResType]["relationships"] = keyof S["resources"][ResType]["relationships"]
> = Readonly<(
  { type: ResType & string; id: string; }
  & {
    [PropType in PropTypes]:
      ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
  }
  & Readonly<{
    [RelType in RelTypes]:
      S["resources"][ResType]["relationships"][RelType]["cardinality"] extends "many"
        ? QueryResultResource<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
        : QueryResultResource<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
)>

// ----Validations---------------------------------------------------------------------------------
export type BaseValidationError = {
  message: string;
  validationName: string;
  [k: string]: any;
}

export type ResourceValidationError<S extends Schema> = (
  BaseValidationError
  & {
    type: keyof S["resources"] & string,
    id: string,
    validationType: "resource",
  }
);

export type GraphValidationError = BaseValidationError
  & {
    validationType: "graph",
  }

export type GraphValidation = {
  validate: <S extends Schema, ResType extends keyof S["resources"]>(
    newGraph: QueryResultResource<S, ResType>,
    oldGraph: QueryResultResource<S, ResType>,
    options: {
      schema: S,
    },
  ) => null | GraphValidationError[];
}

export type ResourceValidation = {
  validate: <S extends Schema, ResType extends keyof S["resources"]>(
    newResource: ResourceOfType<S, ResType>,
    oldResource: ResourceOfType<S, ResType>,
    options: {
      schema: ExpandedSchema<S>,
    },
  ) => null | ResourceValidationError<S>[];
}

export type ValidationError<S extends Schema> = ResourceValidationError<S> | GraphValidationError;

// ----Resources-----------------------------------------------------------------------------------
export type ResourceRef<S extends Schema> = Readonly<{
  type: keyof S["resources"] & string;
  id: string;
}>

export type ResourceRefOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{ type: ResType & string, id: string }>
)

type ResourceOfTypeRel<
  S extends Schema,
  ResType extends keyof S["resources"] & string,
  RelType extends keyof S["resources"][ResType]["relationships"] & string
> = (
  S["resources"][ResType]["relationships"][RelType]["cardinality"] extends "one"
    ? ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>
    : ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
);

export type ResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{
    type: ResType & string;
    id: string;
    properties: Readonly<{
      [PropType in keyof S["resources"][ResType]["properties"]]:
        ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
    }>,
    relationships: Readonly<{
      [RelType in keyof S["resources"][ResType]["relationships"]]: ResourceOfTypeRel<S, ResType, RelType>
    }>
  }>
);

export type MutableResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{
    type: ResType & string;
    id: string;
    properties: {
      [PropType in keyof S["resources"][ResType]["properties"]]:
        ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
    },
    relationships: {
      [RelType in keyof S["resources"][ResType]["relationships"]]: ResourceOfTypeRel<S, ResType, RelType>
    }
  }>
);

export type ResourceUpdateOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{
    type: ResType & string;
    id: string;
    properties: Readonly<Partial<{
      [PropType in keyof S["resources"][ResType]["properties"]]:
        ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
    }>>,
    relationships: Readonly<Partial<{
      [RelType in keyof S["resources"][ResType]["relationships"]]: ResourceOfTypeRel<S, ResType, RelType>
    }>>
  }>
);

export interface ResourceTreeRef<S extends Schema> extends ResourceRef<S> {
  properties: Record<string, never>;
  relationships: Record<string, never>;
}

// same as Resource<S>?
export type ExpandedResourceTree<S extends Schema> = OneOf<{
  [ResType in keyof S["resources"]]: {
    type: ResType & string;
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
  type: ResType & string;
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

export type NormalizedResources<S extends Schema> = Readonly<{
  [ResType in keyof S["resources"]]: Record<string, ResourceOfType<S, ResType & string>>;
}>;

export type MutableNormalizedResources<S extends Schema> = Readonly<{
  [ResType in keyof S["resources"]]: Record<string, MutableResourceOfType<S, ResType & string>>;
}>

// TODO: args can/should be Res extends ResourceOfType<any, any> ?
export type ResourceUpdate<S extends Schema, ResType extends keyof S["resources"], Res extends ResourceOfType<S, ResType>> = {
  type: Res["type"];
  id: string;
  properties?: Partial<Res["properties"]>;
  relationships?: Partial<Res["relationships"]>;
};

// TODO: likely a replacement for ResourceUpdate -- or worthless
export type FullResourceUpdate<S extends Schema, ResType extends keyof S["resources"]> = {
  type: ResType;
  id: string;
  properties: Partial<S["resources"][ResType]["properties"]>;
  relationships: Partial<S["resources"][ResType]["relationships"]>;
};

export type NormalizedResourceUpdates<S extends Schema> = {
  [ResType in keyof S["resources"]]:
    Record<string, null | ResourceUpdate<S, ResType, ResourceOfType<S, ResType>>>
};

export type ReplacementErrors<S extends Schema> = Readonly<{
  isValid: false;
  errors: ValidationError<S>[];
}>;

export type ReplacementResponse<S extends Schema> = (
  { data: NormalizedResourceUpdates<S>, isValid: true }
  | ReplacementErrors<S>
);

// ----Store---------------------------------------------------------------------------------------
export interface PolygraphStore<S extends Schema> {
  get: <
    ResType extends keyof S["resources"],
    Q extends Query<S, ResType>,
    QProps extends QueryProps<S, ResType, Q>,
    QRels extends QueryRels<S, ResType, Q>,
  >(
    query: Q & { type: ResType },
    params?: QueryParams<S>
  ) => "id" extends keyof Q ? Promise<QueryResultResource<S, ResType, QProps, QRels>> : Promise<QueryResultResource<S, ResType, QProps, QRels>[]>;

  replaceOne: <ResType extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, ResType>,
    tree: DataTree,
    params?: QueryParams<S>
  ) => Promise<ReplacementResponse<S>>;

  replaceMany: <ResType extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, ResType>,
    trees: DataTree[],
    params?: QueryParams<S>
  ) => Promise<ReplacementResponse<S>>;
}

// Memory Store: TODO: separate package
export interface MemoryStore<S extends Schema> extends PolygraphStore<S> {
  replaceResources: (resources: NormalizedResources<S>) => Promise<ReplacementResponse<S>>;
}
