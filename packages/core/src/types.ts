export interface QueryRelationship {
  attributes?: [string];
  relationships?: { [k: string]: QueryRelationship };
}

interface QueryWithId {
  type: string;
  id: string;
  attributes?: [string];
  relationships?: { [k: string]: QueryRelationship };
}

interface QueryWithoutId {
  type: string;
  attributes?: [string];
  relationships?: { [k: string]: QueryRelationship };
}

export type Query = QueryWithId | QueryWithoutId;

export interface Schema {
  resources: { [k: string]: SchemaResource };
  title?: string;
  meta?: any;
}

export interface SchemaResource {
  singular: string;
  plural: string;
  attributes: { [k: string]: SchemaAttribute | SchemaRelationship };
  meta?: any;
}

export interface SchemaAttribute {
  type: string;
  meta?: any;
}

export interface SchemaRelationship {
  cardinality: "one" | "many";
  type: string;
  inverse?: string;
  meta?: any;
}

export interface FullSchema extends Schema {
  resources: { [k: string]: FullSchemaResource };
}

export interface FullSchemaResource extends SchemaResource {
  attributes: { [k: string]: FullSchemaAttribute | FullSchemaRelationship };
  name: string;
}

export interface FullSchemaAttribute extends SchemaAttribute {
  name: string;
}

export interface FullSchemaRelationship extends SchemaRelationship {
  name: string;
}

// Graphs don't distinguish between attributes and relationships, but queries do (mitigated with graphql syntax)
export interface Graph {
  type: string;
  id: string;
  attributes: { [k: string]: any };
}

export interface ResourceRef {
  type: string;
  id: string;
}

export interface Resource extends ResourceRef {
  attributes: ResourceAttributes;
}

export interface RelationshipReplacement {
  type: string;
  id: string;
  relationship: string;
  foreignId: string;
}

export interface RelationshipReplacements {
  type: string;
  id: string;
  relationship: string;
  foreignIds: string[];
}

interface DeleteInterface {
  type: string;
  id: string;
  relationship: string;
}

interface MultiDeleteInterface extends DeleteInterface {
  foreignIds: string[];
}

export interface ResourceAttributes {
  [k: string]: any;
}

export interface NormalizedResources {
  [k: string]: { [k: string]: ResourceAttributes };
}

// should a store be a CLASS constructed with a schema or a FUNCTION that takes a schema?
// let's start with FUNCTION until there's a reason to change

export interface Store {
  // crud level
  fetchResource: (type: string, id: string) => Promise<Resource>;
  create: (resource: Resource) => Promise<any>;
  update: (resource: Resource) => Promise<any>;
  upsert: (resource: Resource) => Promise<any>;
  delete?: (resource: Resource) => Promise<any>;

  // pg level
  merge: (query: Query, graph: Graph) => Promise<any>;
  // query: ((query: QueryWithId) => Promise<Graph>) | ((query: QueryWithoutId) => Promise<Graph[]>)
  query: (query: Query) => Promise<Graph | Graph[]>;
  replace: (query: Query, graph: Graph) => Promise<any>;

  // are these relationship methods replaceable with merge/replace above?
  // replaceRelationship({ type: 'bear', id: '1', relationship: 'home', foreignId: '2' })
  // ~equivalent to~
  // replace({ type: 'bear', id: '1' }, { type: 'bears', id: '1', home: '2' })

  // appendRelationships({ type: 'bear', id: '1', relationship: 'powers', foreignIds: ['2'] })
  // ~NOT equivalent to~
  // merge({ type: 'bear', id: '1' }, { type: 'bears', id: '1', powers: ['2'] })

  // it appears that the singular e.g. "replaceRelationship" can go, while "replaceRelationships" should stay,
  // but there's no harm in keeping them all?

  replaceRelationship?: (resource: RelationshipReplacement) => Promise<any>;
  replaceRelationships?: (resource: RelationshipReplacements) => Promise<any>;
  appendRelationships?: (resource: RelationshipReplacements) => Promise<any>;
  deleteRelationship?: (resource: DeleteInterface) => Promise<any>;
  deleteRelationships?: (resource: MultiDeleteInterface) => Promise<any>;
}
