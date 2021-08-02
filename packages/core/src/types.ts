type QueryParam = unknown;
export type QueryParams = { [k: string]: QueryParam };

export interface Operation {
  $first?: boolean;
  $id?: string;
  $not?: Operation;
  [k: string]: Operation | string | number | boolean;
}

export interface QueryRelationship {
  properties?: string[];
  relationships?: { [k: string]: QueryRelationship };
  params?: { [k: string]: QueryParam }
}

interface QueryWithoutId {
  type: string;
  properties?: string[];
  relationships?: { [k: string]: QueryRelationship };
  params?: { [k: string]: QueryParam }
}

interface QueryWithId extends QueryWithoutId {
  id: string;
}

export type Query = QueryWithId | QueryWithoutId;

export type CompiledQuery = {
  type: string;
  properties: string[];
  relationships: { [k: string]: CompiledQuery };
  params: { [k: string]: QueryParam }
}

export interface ResourceTree {
  type: string;
  id: string;
  properties: { [k: string]: unknown };
  relationships: { [k: string]: ResourceTree[] };
}

export type DataTree = {
  [k: string]: unknown | DataTree | DataTree[] | null
}

export interface ResourceRef {
  type: string;
  id: string;
}

export interface ResourceAttributes {
  [k: string]: unknown;
}

export interface DividedResource extends ResourceRef {
  properties: { [k: string]: unknown };
  relationships: { [k: string]: unknown };
}

export interface Resource extends ResourceRef {
  attributes: ResourceAttributes;
}

export interface Relationship {
  source: ResourceRef;
  target: ResourceRef;
  label: string;
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

export interface NormalizedResources {
  [k: string]: { [k: string]: ResourceAttributes };
}

export interface MutatingResources {
  [k: string]: { [k: string]: ResourceAttributes | symbol };
}

export interface PolygraphStore {
  match: (query: Query) => Promise<DataTree | DataTree[]>;
  mergeOne: (query: Query, tree: DataTree, params?: QueryParams) => Promise<any>;
  mergeMany: (query: Query, trees: DataTree[], params?: QueryParams) => Promise<any>;
  replaceOne: (query: Query, tree: DataTree, params?: QueryParams) => Promise<any>;
  replaceMany: (query: Query, trees: DataTree[], params?: QueryParams) => Promise<any>;
}

// should a store be a CLASS constructed with a schema or a FUNCTION that takes a schema?
// let's start with FUNCTION until there's a reason to change

export interface CrudStore {
  find: (type: string, criteria?: { [k: string]: unknown }) => Promise<Resource[]>;
  findOne: (resourceRef: ResourceRef) => Promise<Resource>;
  create: (resource: Resource) => Promise<any>;
  update: (resource: Resource) => Promise<any>;
  upsert: (resource: Resource) => Promise<any>;
  delete: (resource: Resource) => Promise<any>;
  createRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<any>;
  deleteRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<any>;
  updateRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<any>;
  upsertRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<any>;
}

export interface Store extends CrudStore {
  // pg level
  match: (query: Query) => Promise<DataTree | DataTree[]>;
  merge: (query: Query, tree: Tree) => Promise<any>;
  replace: (query: Query, tree: Tree) => Promise<any>;
  transaction: (operations: Operation[]) => Promise<any>;

  // are these relationship methods replaceable with merge/replace above?
  // replaceRelationship({ type: 'bear', id: '1', relationship: 'home', foreignId: '2' })
  // ~equivalent to~
  // replace({ type: 'bear', id: '1' }, { type: 'bears', id: '1', home: '2' })

  // appendRelationships({ type: 'bear', id: '1', relationship: 'powers', foreignIds: ['2'] })
  // ~NOT equivalent to~
  // merge({ type: 'bear', id: '1' }, { type: 'bears', id: '1', powers: ['2'] })

  // it appears that the singular e.g. "replaceRelationship" can go, while "replaceRelationships"
  // should stay, but there's no harm in keeping them all?

  replaceRelationship?: (resource: RelationshipReplacement) => Promise<any>;
  replaceRelationships?: (resource: RelationshipReplacements) => Promise<any>;
  appendRelationships?: (resource: RelationshipReplacements) => Promise<any>;
  deleteRelationship?: (resource: DeleteInterface) => Promise<any>;
  deleteRelationships?: (resource: MultiDeleteInterface) => Promise<any>;
}
