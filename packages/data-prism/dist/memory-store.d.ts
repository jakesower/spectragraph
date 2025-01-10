import Ajv from "ajv";
import { Schema } from "./schema.js";
import { Graph, NormalResource } from "./graph.js";
import { DeleteResource } from "./delete.js";
import { RootQuery } from "./query.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export type Ref = {
    type: string;
    id: string;
};
export type NormalResourceTree = {
    type: string;
    id?: string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: NormalResourceTree | NormalResourceTree[] | Ref | Ref[] | null;
    };
};
export type MemoryStoreConfig = {
    initialData?: Graph;
    validator?: Ajv;
};
type CreateResource = {
    type: string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[] | null;
    };
} | {
    type: string;
    id: string;
    new: true;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[] | null;
    };
};
type UpdateResource = {
    type: string;
    id: string;
    attributes?: {
        [k: string]: unknown;
    };
    relationships?: {
        [k: string]: Ref | Ref[] | null;
    };
};
export type Store = {
    getOne: (type: string, id: string) => NormalResource;
    create: (resource: CreateResource) => NormalResource;
    update: (resource: UpdateResource) => NormalResource;
    upsert: (resource: CreateResource | UpdateResource) => NormalResource;
    delete: (resource: DeleteResource) => DeleteResource;
    query: (query: RootQuery) => any;
    splice: (resource: NormalResourceTree) => NormalResourceTree;
};
export type MemoryStore = Store & {
    linkInverses: () => void;
    merge: (graph: Graph) => void;
    mergeTree: (resourceType: string, tree: any, mappers?: any) => void;
    mergeTrees: (resourceType: string, trees: any[], mappers?: any) => void;
};
export declare function createMemoryStore(schema: Schema, config?: MemoryStoreConfig): MemoryStore;
//# sourceMappingURL=memory-store.d.ts.map