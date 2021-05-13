export interface QueryRelationship {
  properties?: [string];
  relationships?: { [k: string]: QueryRelationship };
}

interface QueryWithoutId {
  type: string;
  properties?: [string];
  relationships?: { [k: string]: QueryRelationship };
}

interface QueryWithId extends QueryWithoutId {
  id: string;
}

export type Query = QueryWithId | QueryWithoutId;

// Trees don't distinguish between attributes and relationships, but queries do (mitigated with graphql syntax)
export interface Tree {
  type: string;
  id: string;
  attributes: { [k: string]: any };
}

export interface ResourceRef {
  type: string;
  id: string;
}

export interface Resource extends ResourceRef {
  properties: ResourceAttributes;
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

export interface MutatingResources {
  [k: string]: { [k: string]: ResourceAttributes | Symbol };
}

export interface CreateOperation {
  operation: "create";
  resource: Resource;
}

export interface UpdateOperation {
  operation: "update";
  resource: Resource;
}

export interface DeleteOperation {
  operation: "delete";
  resource: ResourceRef;
}

export type Operation = CreateOperation | DeleteOperation | UpdateOperation;

// should a store be a CLASS constructed with a schema or a FUNCTION that takes a schema?
// let's start with FUNCTION until there's a reason to change

export interface Store {
  // crud level
  read: (resourceRef: ResourceRef) => Promise<Resource>;
  create: (resource: Resource) => Promise<any>;
  update: (resource: Resource) => Promise<any>;
  upsert: (resource: Resource) => Promise<any>;
  delete?: (resource: Resource) => Promise<any>;

  // pg level
  merge: (query: Query, graph: Tree) => Promise<any>;
  // query: ((query: QueryWithId) => Promise<Graph>) | ((query: QueryWithoutId) => Promise<Graph[]>)
  query: (query: Query) => Promise<Tree | Tree[]>;
  replace: (query: Query, graph: Tree) => Promise<any>;
  transaction: (operations: Operation[]) => Promise<any>;

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
