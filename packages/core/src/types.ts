/* eslint-disable max-len, no-use-before-define, @typescript-eslint/ban-types */

import { PolygraphError } from "./validations/errors";

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
type SchemaPropertyTypes = {
  boolean: boolean;
  number: number;
  string: string;
}

export type Schema = Readonly<{
  title?: string;
  urlName: string;
  resources: Readonly<{
    [k: string]: Readonly<{
      singular?: string;
      plural?: string;
      idField?: string;
      properties: Readonly<{
        [k: string]: Readonly<{
          default?: any;
          optional?: boolean;
          type: keyof SchemaPropertyTypes;
        }>
      }>
      relationships: Readonly<{
        [k: string]: Readonly<{
          cardinality: "one" | "many";
          relatedType: string;
          inverse?: string;
        }>
      }>
    }>
  }>
}>;

// export type ValidSchema<S extends Schema> = (
//   S &
//   Readonly<{
//     resources: Readonly<{
//       [RT in keyof S["resources"]]: {
//         relationships: Readonly<{
//           [RelType in keyof S["resources"][RT]["relationships"]]: {
//             type: keyof S["resources"];
//           }
//         }>
//       }
//     }>
//   }>
// )

export type ExpandedSchema<S extends Schema> = (
  Readonly<{
    title?: string;
    urlName: string;
    resources: Readonly<{
      [RT in keyof S["resources"]]: {
        properties: Readonly<{
          [PropType in keyof S["resources"][RT]["properties"]]: {
            default?: any;
            optional?: boolean;
            type: keyof SchemaPropertyTypes;
          }
        }>;
        relationships: Readonly<{
          [RelType in keyof S["resources"][RT]["relationships"]]: {
            cardinality: "one" | "many";
            inverse?: string;
            relatedType: S["resources"][RT]["relationships"][RelType]["relatedType"] & string;
          }
        }>
      }
    }>
  }>
)

// ----Queries-------------------------------------------------------------------------------------
export type SubQuery<S extends Schema, RT extends keyof S["resources"]> = Readonly<{
  properties?: readonly (keyof S["resources"][RT]["properties"] & string)[];
  relationships?: Partial<{
    [RelType in keyof S["resources"][RT]["relationships"]]:
      SubQuery<S, S["resources"][RT]["relationships"][RelType]["relatedType"]>
  }>
  referencesOnly?: boolean;
}>

export type Query<S extends Schema, RT extends keyof S["resources"]> = (
  SubQuery<S, RT> &
  Readonly<{
    type: RT & string;
    id?: string;
  }>
);

// ----Query Results-------------------------------------------------------------------------------
export type DataTree = Record<string, any>;

export type DataTreeOfType<S extends Schema, RT extends keyof S["resources"]> = (
  { id: string; }
  & {
    [PropType in keyof S["resources"][RT]["properties"]]:
      SchemaPropertyTypes[S["resources"][RT]["properties"][PropType]["type"]];
  }
  & {
    [RelType in keyof S["resources"][RT]["relationships"]]:
      S["resources"][RT]["relationships"][RelType]["cardinality"] extends "one"
        ? DataTreeOfType<S, S["resources"][RT]["relationships"][RelType]["relatedType"]>
        : DataTreeOfType<S, S["resources"][RT]["relationships"][RelType]["relatedType"]>[];
  }
);

// ----Resources-----------------------------------------------------------------------------------
export type ResourceRef<S extends Schema, RT extends keyof S["resources"]> = (
  Readonly<{ type: RT & string, id: string }>
);

type ResourceRel<
  S extends Schema,
  RT extends keyof S["resources"] & string,
  RelType extends keyof S["resources"][RT]["relationships"] & string
> = (
  S["resources"][RT]["relationships"][RelType]["cardinality"] extends "one"
    ? (ResourceRef<S, S["resources"][RT]["relationships"][RelType]["relatedType"]> | null)
    : ResourceRef<S, S["resources"][RT]["relationships"][RelType]["relatedType"]>[]
);

export type Resource<S extends Schema, RT extends keyof S["resources"] & string> = (
  { id: string; }
  & {
    [PropType in keyof S["resources"][RT]["properties"]]:
      SchemaPropertyTypes[S["resources"][RT]["properties"][PropType]["type"]];
  }
  & {
    [RelType in keyof S["resources"][RT]["relationships"]]: ResourceRel<S, RT, RelType & string>
  }
);

export type NormalResource<S extends Schema, RT extends keyof S["resources"]> = (
  Readonly<{
    type: RT & string;
    id: string;
    properties: Readonly<{
      [PropType in keyof S["resources"][RT]["properties"]]:
        SchemaPropertyTypes[S["resources"][RT]["properties"][PropType]["type"]]
    }>,
    relationships: Readonly<{
      [RelType in keyof S["resources"][RT]["relationships"]]:
        ResourceRel<S, RT & string, RelType & string>
    }>
  }>
);

export type NormalResourceUpdate<S extends Schema, RT extends keyof S["resources"]> = (
  Readonly<{
    type: RT & string;
    id: string;
    properties: Readonly<Partial<{
      [PropType in keyof S["resources"][RT]["properties"]]:
        SchemaPropertyTypes[S["resources"][RT]["properties"][PropType]["type"]]
    }>>,
    relationships: Readonly<Partial<{
      [RelType in keyof S["resources"][RT]["relationships"]]:
        ResourceRel<S, RT & string, RelType & string>
    }>>,
  }>
);

// ----Store---------------------------------------------------------------------------------------
export type NormalStore<S extends Schema> = {
  [RT in keyof S["resources"]]: Record<string, NormalResource<S, RT & string>>;
}

export type Store<S extends Schema> = {
  [RT in keyof S["resources"]]: Record<string, Resource<S, RT & string>>;
}

export interface PolygraphStore<S extends Schema> {
  get: <
    RT extends keyof S["resources"],
    Q extends Query<S, RT>,
  >(
    query: Q & Query<S, RT>,
  ) => "id" extends keyof Q ? Promise<any> : Promise<any[]>;

  replaceOne: <RT extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, RT>,
    tree: DataTree,
  ) => Promise<Store<S>>;

  replaceMany: <RT extends keyof S["resources"]>(
    query: Query<ExpandedSchema<S>, RT>,
    trees: DataTree[],
  ) => Promise<Store<S>>;
}
