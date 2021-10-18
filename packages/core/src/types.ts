/* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

// ----Helpers-------------------------------------------------------------------------------------
export type OneOf<T> = T[keyof T];
export type KeyRecord<T> = {
  [K in keyof T]: T[K]
}
type ArrayToUnion<T> = (
  T extends [infer Head, ...infer Tail]
    ? Tail extends [any, ...any[]]
      ? Head | ArrayToUnion<Tail>
      : Head
    : never
);

type WithCardinality<T, U extends ("one" | "many")> = U extends "many" ? T[] : T;

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

// type StringPropertiesOnly<T> = Readonly<{ [K in keyof T as string extends K ? K : never]: T[K] }>

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

export type Schema = Readonly<{
  title?: string;
  resources: Readonly<{
    [k: string]: Readonly<{
      singular?: string;
      plural?: string;
      idField?: string;
      properties: Readonly<{
        [k: string]: Readonly<{
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
  properties?: (keyof S["resources"][ResType]["properties"] & string)[];
  relationships?: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      SubQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
  referencesOnly?: boolean;
  params?: Record<string, QueryParams<S>>;
}>

export type QueryWithoutId<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<SubQuery<S, ResType>> & { readonly type: ResType & string }
);

export type QueryWithId<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<QueryWithoutId<S, ResType>> & { readonly id: string }
);

export type Query<S extends Schema, ResType extends keyof S["resources"]> = Readonly<{
  properties?: (keyof S["resources"][ResType]["properties"] & string)[];
  relationships?: Partial<{
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      SubQuery<S, S["resources"][ResType]["relationships"][RelType]["type"]>
  }>
  referencesOnly?: boolean;
  params?: Record<string, QueryParams<S>>;
  type: ResType & string;
  id?: string;
}>

export type SubQueryShape = Readonly<{
  properties?: string[];
  relationships?: Record<string, SubQueryShape>;
  referencesOnly?: boolean;
  // params?: Record<string, QueryParams<S>>;
  type: string;
}>;

export type QueryShape = (
  SubQueryShape & Readonly<{ id?: string }>
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
  properties: (keyof S["resources"][ResType]["properties"])[];
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
)

export type CompiledExpandedQuery<
  S extends Schema,
  ResType extends keyof S["resources"],
> = CompiledExpandedSubQuery<S, ResType> & Readonly<{
  type: ResType & string;
  id: string | null;
  properties: (keyof S["resources"][ResType]["properties"])[];
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

// TODO: working with all properties supplied explicitly; expand it
type ResourcePropertyTypeOf<K extends SchemaPropertyType> = (
  K extends "string" ? string
    : K extends "number" ? number
    : K extends "boolean" ? boolean
    : never
);

export type SubQueryResultExpanded<
  S extends Schema,
  CSQ extends CompiledExpandedSubQuery<S, ResType>,
  ResType extends keyof S["resources"],
  PropKeys extends (keyof S["resources"][ResType]["properties"])[] = CSQ["properties"],
> = Readonly<(
  null
  | (
    { type: ResType; id: string; }
    & {
      [PropType in keyof S["resources"][ResType]["properties"]]:
        PropType extends PropKeys
          ? ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
          : never;
    }
    & {
      [RelType in keyof S["resources"][ResType]["relationships"]]:
        S["resources"][ResType]["relationships"][RelType]["cardinality"] extends "many"
          ? SubQueryResult<S, CSQ, S["resources"][ResType]["relationships"][RelType]["type"]>[]
          : SubQueryResult<S, CSQ, S["resources"][ResType]["relationships"][RelType]["type"]>
    }
  )
)>;

// export type SubQueryResult<
//   S extends Schema,
//   CSQ extends CompiledSubQuery<S, ResType>,
//   ResType extends keyof S["resources"],
// > = (
//   null
//   | CSQ extends CompiledExpandedSubQuery<S, ResType>
//     ? SubQueryResultExpanded<S, CSQ, ResType>
//     : CSQ extends CompiledRefQuery<S, ResType>
//     ? ResourceRefOfType<S, ResType>
//     : never
// );
export type SubQueryResult<
S extends any,
CQ extends any,
ResType extends any,
> = (
any);

type QueryResultExpanded<
  S extends Schema,
  CQ extends CompiledExpandedQuery<S, ResType>,
  ResType extends keyof S["resources"],
  PropKeys extends (keyof S["resources"][ResType]["properties"])[] = CQ["properties"],
> = (
  { type: ResType; id: string; }
  & {
    [PropType in keyof S["resources"][ResType]["properties"]]:
      PropType extends ArrayToUnion<PropKeys>
        ? ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
        : never
  }
  & {
    [RelType in keyof S["resources"][ResType]["relationships"]]:
      RelType extends keyof CQ["relationships"]
        ? SubQueryResult<S, CQ["relationships"][RelType], S["resources"][ResType]["relationships"][RelType]["type"]>
        : "never"
  }
);

// export type QueryResult<
//   S extends Schema,
//   CQ extends CompiledQuery<S, ResType>,
//   ResType extends keyof S["resources"],
// > = (
//   null
//   | CQ extends CompiledExpandedQuery<S, ResType>
//     ? QueryResultExpanded<S, CQ, ResType>
//     : CQ extends CompiledRefQuery<S, ResType>
//     ? ResourceRefOfType<S, ResType>
//     : never
// );
export type QueryResult<
S extends any,
CQ extends any,
ResType extends any,
> = (
any);

// export type QueryResult<
//   S extends Schema,
//   XS extends ExpandedSchema<S>,
//   CQ extends CompiledQuery<S, XS, ResType>,
//   ResType extends keyof S["resources"],
// > = Readonly<(
//   null
//   | "properties" extends keyof CQ
//     ? (
//         { type: ResType; id: string; }
//         & {
//           [PropType in keyof S["resources"][ResType]["properties"]]:
//             PropType extends CQ["properties"]
//               ? ResourcePropertyTypeOf<S["resources"][ResType]["properties"][PropType]["type"]>
//               : never;
//         }
//         & {
//           [RelType in keyof S["resources"][ResType]["relationships"]]:
//             RelType extends CQ["relationships"]
//               ? SubQueryResult<S, XS, CQ["relationships"][RelType], S["resources"][ResType]["relationships"][RelType]["type"]>
//               : never
//         }
//         // & Record<string, QueryResultProperties<S, ResType> | any>
//       )
//     : "{ type: ResType; id: string }"
// )>;

// ----Resources-----------------------------------------------------------------------------------
export type ResourceRef<S extends Schema> = Readonly<{
  type: keyof S["resources"] & string;
  id: string;
}>

export type ResourceRefOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{ type: ResType & string, id: string }>
)

export type ResourceOfType<S extends Schema, ResType extends keyof S["resources"]> = (
  Readonly<{
    type: ResType & string;
    id: string;
    properties: Readonly<{
      [PropType in keyof S["resources"][ResType]["properties"]]: any
    }>,
    relationships: Readonly<{
      [RelType in keyof S["resources"][ResType]["relationships"]]:
        ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>
        | ResourceRefOfType<S, S["resources"][ResType]["relationships"][RelType]["type"]>[]
    }>
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

// type GetOneFn<S extends Schema> = <ResType extends keyof S["resources"], Q extends QueryWithId<S, ResType>>(
//   query: Q,
//   params?: QueryParams<S>
// ) => "id" extends keyof Q ? Promise<QueryResult<S, ResType>> : Promise<QueryResult<S, ResType>[]>;
// type GetManyFn<S extends Schema> = <ResType extends keyof S["resources"], Q extends QueryWithoutId<S, ResType>>(
//   query: Q,
//   params?: QueryParams<S>
// ) => "id" extends keyof Q ? Promise<QueryResult<S, ResType>> : Promise<QueryResult<S, ResType>[]>;

// export type GetFn<S extends Schema, ResType extends keyof S["resources"], Q extends QueryWithId<S, ResType>> = (
//   "id" extends keyof Q
//     ? GetOneFn<S>
//     : GetManyFn<S>
// )

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore<S extends Schema> {
  get: <
    ResType extends keyof S["resources"],
    Q extends Query<S, ResType>,
    CQ extends CompiledQuery<S, ResType>
  >(
    query: Q & { type: ResType },
    params?: QueryParams<S>
    // t: ResType,
  ) => "id" extends keyof CQ ? Promise<QueryResult<S, CQ, ResType>> : Promise<QueryResult<S, CQ, ResType>[]>;
  // ) => Q

  // get: <H extends Schema, XH extends ExpandedSchema<H>, ResType extends keyof H["resources"], Q extends Query<H, XH, ResType>>(
  //   query: Q,
  //   params?: QueryParams<H>
  // ) => "id" extends keyof Q ? Promise<QueryResult<H, ResType>> : Promise<QueryResult<H, ResType>[]>;

  replaceOne: <ResType extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, ResType>,
    tree: DataTree,
    params?: QueryParams<S>
  ) => Promise<NormalizedResourceUpdates<S>>;

  replaceMany: <ResType extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, ResType>,
    trees: DataTree[],
    params?: QueryParams<S>
  ) => Promise<NormalizedResourceUpdates<S>>;
}

// Memory Store: TODO: separate package
export interface MemoryStore<S extends Schema> extends PolygraphStore<S> {
  replaceResources: (resources: NormalizedResources<S>) => Promise<NormalizedResourceUpdates<S>>;
}
