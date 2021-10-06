import { Resource } from '@polygraph/data-graph/dist/types';
interface SubQuery {
    relationships?: {
        [k: string]: SubQuery;
    };
}
export interface Query {
    type: string;
    id?: string;
    attributes?: {
        [k: string]: any;
    };
    relationships?: {
        [k: string]: SubQuery;
    };
}
export interface Schema {
    resources: {
        [k: string]: SchemaResource;
    };
    title?: string;
    meta?: any;
}
export interface SchemaResource {
    singular: string;
    plural: string;
    attributes: {
        [k: string]: SchemaAttribute | SchemaRelationship;
    };
    meta?: any;
}
export interface SchemaAttribute {
    name: string;
    type: string;
    meta?: any;
}
export interface SchemaRelationship {
    name: string;
    cardinality: 'one' | 'many';
    type: string;
    inverse?: string;
    meta?: any;
}
export interface Graph {
    type: string;
    id: string;
    attributes: {
        [k: string]: any;
    };
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
export interface Store {
    fetchResource: (type: string, id: string) => Promise<Resource>;
    fetchGraph: (query: Query) => Promise<Graph | Graph[]>;
    create: (resource: Resource) => Promise<any>;
    update: (resource: Resource) => Promise<any>;
    delete?: (resource: Resource) => Promise<any>;
    merge: (query: Query, graph: Graph) => Promise<any>;
    query: (query: Query) => Promise<any>;
    replace: (query: Query, graph: Graph) => Promise<any>;
    replaceRelationship?: (resource: RelationshipReplacement) => Promise<any>;
    replaceRelationships?: (resource: RelationshipReplacements) => Promise<any>;
    appendRelationships?: (resource: RelationshipReplacements) => Promise<any>;
    deleteRelationship?: (resource: DeleteInterface) => Promise<any>;
    deleteRelationships?: (resource: MultiDeleteInterface) => Promise<any>;
}
export {};
