import { Schema } from "./schema.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export type Ref = {
    type: string;
    id: string | number;
};
export type NormalResource = {
    id?: number | string;
    type?: string;
    attributes: {
        [k: string]: unknown;
    };
    relationships: {
        [k: string]: Ref | Ref[] | null;
    };
};
export type Graph = {
    [k: string]: {
        [k: string | number]: NormalResource;
    };
};
export declare function createMemoryStore(schema: Schema, initialData?: Graph): {
    linkInverses: () => void;
    create: (resource: any) => import("./graph.js").NormalResource;
    update: (resource: any) => import("./graph.js").NormalResource;
    delete: (resource: any) => import("./graph.js").NormalResource;
    merge: (graph: Graph) => void;
    mergeTree: (resourceType: string, tree: {
        [k: string]: unknown;
    }, mappers?: {}) => void;
    mergeTrees: (resourceType: string, trees: {
        [k: string]: unknown;
    }[], mappers?: {}) => void;
    query: (query: any) => any;
};
//# sourceMappingURL=store.d.ts.map