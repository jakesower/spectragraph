/* eslint-disable max-len, no-use-before-define */

// Helper Types
type OneOf<T> = T[keyof T];
type ResourcePropertyTypeOf<K extends SchemaPropertyType> = (
  K extends "string" ? string
    : K extends "number" ? number
    : K extends "boolean" ? boolean
    : never
)
type IntersectionOrAll<
  T extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  U extends Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  K extends string
> = (
  K extends keyof T ? (keyof T & keyof U) : keyof U
);
type WithCardinality<T, U extends ("one" | "many")> = U extends "many" ? T[] : T;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Intersection<T extends any[]> = T extends [infer First, ...infer Rest]
  ? First & Intersection<Rest>
  : unknown;
/* eslint-enable @typescript-eslint/no-explicit-any */

// type YYY = { x: string } & unknown;
type ZZZ = Intersection<[{ a: string }, { b: number }, { c: unknown }]>

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

type SchemaResource = {
  singular: string;
  plural: string;
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

type BaseSchemaRelationshipKeys = "cardinality" | "meta";
export type CompiledSchemaRelationship<S extends Schema, SR extends SchemaRelationship> =
  Extract<SR, BaseSchemaRelationshipKeys>
  & {
    name: string,
    type: keyof S["resources"],
    inverse: string
  }

type BaseSchemaResourceKeys = "singular" | "plural" | "meta";
export type CompiledSchemaResource<S extends Schema, ResType extends keyof S["resources"]> =
  Pick<S["resources"][ResType], BaseSchemaResourceKeys>
  & {
    // attributes: CompiledSchemaAttribute;
    // attributesArray: CompiledSchemaAttribute[];
    name: string;
    idField: string;
    properties: {
      [P in keyof S["resources"][ResType]["properties"]]:
        S["resources"][ResType]["properties"][P] & { name: P } };
    propertiesArray: S["resources"][ResType]["properties"][keyof S["resources"][ResType]["properties"]] & { name: string };
    propertyNames: (keyof S["resources"][ResType]["properties"])[]; // TODO: make this a tuple?
    propertyNamesSet: Set<keyof S["resources"][ResType]["properties"]>;
    relationships: {
      [P in keyof S["resources"][ResType]["relationships"]]:
        CompiledSchemaRelationship<S, S["resources"][ResType]["relationships"][P]>
        & { name: string }
    };
    // relationshipsArray:
    //   CompiledSchemaRelationship<S, S["resources"][ResType]["relationships"][keyof S["resources"][ResType]["relationships"]]>
    //     & { name: string };
    relationshipsByType: S["resources"][ResType]["relationships"];
    relationshipNames: (keyof S["resources"][ResType]["relationships"])[];
    relationshipNamesSet: Set<keyof Extract<S["resources"][ResType]["relationships"], string>>;
  }

export type CompiledSchema<S extends Schema> = {
  [SchemaKey in keyof S]: "resources" extends SchemaKey
    ? { [ResType in keyof S["resources"]]: CompiledSchemaResource<S, ResType> }
    : S[SchemaKey];
}

// Queries
// type WithKeyOf<T, K> = K extends keyof T ? T : never;
export type SubQuery<S extends Schema, ResType extends keyof S["resources"]> = {
  properties?: (keyof S["resources"][ResType]["properties"])[];
  relationships?: SubQuerys<S, S["resources"][ResType]["relationships"]>;
  referencesOnly?: boolean;
}

// type SRWithResType<S extends Schema, RelDef extends Record<string, SchemaRelationship>> = {
//   [P in keyof RelDef]: RelDef[P]
//   & { RelDef["type"] }
// }
type SRWithResType<S extends Schema, RelDef extends SchemaRelationship> = (
  RelDef extends { type: keyof S["resources"] } ? RelDef : never
);
type ResDef<S extends Schema, ResType extends string> = ResType extends keyof S["resources"] ?
  S["resources"][ResType] : never;

// RelDef[K]["type"] is defined as string rather than keyof S[ResType]
// export type SubQuerys<S extends Schema, RelDef extends Record<string, SchemaRelationship>> = {
//   [K in keyof RelDef]: SubQuery<S, ResDef<S, RelDef[K]["type"]>>;
// }
export type SubQuerys<S extends Schema, RelDef extends Record<string, SchemaRelationship>> = {
  [K in keyof RelDef]: SubQuery<S, RelDef[K]["type"]>;
}

// type SubQuerys<S extends Schema, ResRecord extends Record<ResType, ResDef>> = {
//   [RelType in keyof S["resources"][ResType]["relationships"]]:
//     SubQuery<S, S["resources"][ResType]["relationships"][RelType]>
// }

type RootQueryResource<S extends Schema> = {
  [ResType in keyof S["resources"]]: {
    type: ResType;
    id?: string;
    properties?: keyof S["resources"][ResType]["properties"];
    relationships?: SubQuerys<S, S["resources"][ResType]["relationships"]>
    referencesOnly?: boolean;
  }
}

export type Query<S extends Schema> = OneOf<RootQueryResource<S>>;

export type CompiledExpandedQuery<S extends Schema> = OneOf<{
  [ResType in keyof S["resources"]]: {
    type: ResType;
    id: string | null;
    properties: (keyof S["resources"][ResType]["properties"])[];
    referencesOnly: false;
    relationships: {
      [RelType in keyof S["resources"][ResType]["relationships"]]: CompiledQuery<S>;
    };
  }
}>

export type CompiledRefQuery<S extends Schema> = {
  id: string | null;
  type: keyof S["resources"];
  referencesOnly: true;
}

export type CompiledQuery<S extends Schema> = CompiledExpandedQuery<S> | CompiledRefQuery<S>;

export type QueryParams = Record<string, unknown>;

// Result types

type ResultResourceProperties<
  S extends Schema,
  Q extends Query<S>,
  KI = IntersectionOrAll<Q, S["resources"][Q["type"]], "properties">
> = {
  [K in Extract<KI, string>]:
    ResourcePropertyTypeOf<S["resources"][Q["type"]]["properties"][K]>;
}

type ResultRelationshipQuery<
  S extends Schema,
  Q extends Query<S>,
  RelDef extends S["resources"][Q["type"]]["relationships"],
  SQ extends Q["relationships"]
> = (
  RelDef["cardinality"] extends "one"
    ? SQ & { type: RelDef["type"] }
    : (SQ & { type: RelDef["type"] })[]
)

type ResultResourceRelationships<
  S extends Schema,
  Q extends Query<S>,
  KI = IntersectionOrAll<Q, S["resources"][Q["type"]], "relationships">
> = {
  [K in Extract<KI, string>]:
    ResultRelationshipQuery<
      S,
      Q,
      S["resources"][Q["type"]]["relationships"][K],
      Q["relationships"][K]
    >;
}
type GetResultBaseResource<S extends Schema, Q extends Query<S>> = { type: Q["type"], id: string };

type GetResult<S extends Schema, Q extends Query<S>> =
  GetResultBaseResource<S, Q>
  & ResultResourceProperties<S, Q>
  & ResultResourceRelationships<S, Q>;

// Data

export interface ResourceRef<S extends Schema> {
  type: keyof S["resources"];
  id: string;
}

type ResourceProperty<Props extends Record<string, SchemaProperty>> = {
  [K in keyof Props]: ResourcePropertyTypeOf<Props[K]["type"]>;
}

type ResourceRelationship<RelDef extends Record<string, SchemaRelationship>> = {
  [K in keyof RelDef]: WithCardinality<
    { type: RelDef[K]["type"]; id: string },
    RelDef[K]["cardinality"]
  >
}

export type Resources<S extends Schema> = {
  [K in keyof S["resources"]]: {
    type: K;
    id: string;
    properties: ResourceProperty<S["resources"][K]["properties"]>;
    relationships: ResourceRelationship<S["resources"][K]["relationships"]>
  }
}

export type Resource<S extends Schema> = OneOf<Resources<S>>;

export type ResourceTreeRef<S extends Schema, R extends Resource<S>> = {
  type: R["type"];
  id: string;
  properties?: Record<string, never>;
  relationships?: Record<string, never>;
}

type ExpandedResourceTree<S extends Schema, R extends Resource<S>> = {
  [ResType in keyof R]: {
    [KOut in keyof Omit<R[ResType], "relationships">]: R[ResType][KOut]
    & {
      relationships: {
        [RelType in keyof R[ResType]]: ResourceTree<S, R[ResType][RelType]>;
      }
    }
  }
}

export type ResourceTree<S extends Schema, R extends Resource<S>> =
  ResourceTreeRef<S, R>
  | ExpandedResourceTree<S, R>;

export type NormalizedResources<S extends Schema> = {
  [ResType in keyof S["resources"]]: Record<string, Resources<S>[ResType]>;
}
export type NormalizedResourceUpdates<S extends Schema> = {
  [ResType in keyof S["resources"]]: Record<string, Resources<S>[ResType] | null>;
}

// Data Tree

type DataTreeProperties<S extends Schema, T extends keyof S["resources"]> = {
  [PropType in keyof S["resources"][T]["properties"]]:
    ResourcePropertyTypeOf<S["resources"][T]["properties"][PropType]>;
}

type DataTreeRelationships<S extends Schema, T extends keyof S["resources"]> = {
  [RelType in keyof S["resources"][T]["relationships"]]: WithCardinality<
  S["resources"][T]["relationships"][RelType],
  S["resources"][T]["relationships"][RelType]["cardinality"]
  >;
}

export type DataTreeOfType<S extends Schema, T extends keyof S["resources"]> =
  { type: T, id: string }
  & DataTreeProperties<S, T>
  & DataTreeRelationships<S, T>;

// Store

type GetOneFn = <S extends Schema, Q extends Query<S>>(query: Q, params?: QueryParams) =>
  "id" extends Q ? Promise<GetResult<S, Q>> : never;
type GetManyFn = <S extends Schema, Q extends Query<S>>(query: Q, params?: QueryParams) =>
  "id" extends Q ? never : Promise<GetResult<S, Q>[]>;

export type GetFn = GetOneFn & GetManyFn;

// Store -- TODO: deal with wrapping/unwrapping the DataTree <-> ResourceTree
export interface PolygraphStore<S extends Schema> {
  // TODO: distinguish queries returning one vs many results
  get: GetFn;
  replaceOne: <Q extends Query<S>>(query: Q, tree: DataTreeOfType<S, Q["type"]>, params?: QueryParams) =>
    "id" extends Q ? Promise<NormalizedResources<S>> : never;
  replaceMany: <Q extends Query<S>>(query: Q, trees: DataTreeOfType<S, Q["type"]>[], params?: QueryParams) =>
    "id" extends Q ? never : Promise<NormalizedResources<S>>;
}

// Memory Store: TODO: separate package
export type MemoryStore<S extends Schema, Base = PolygraphStore<S>> =
  { [P in keyof Base]: Base[P] }
  & { replaceResources: (resources: NormalizedResources<S>) => Promise<NormalizedResources<S>> };

// type X<T extends Record<string, string>> = 
