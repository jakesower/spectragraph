import { Schema } from "./schema.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export type Ref = {
    type: string;
    id: string;
};
export type NormalResource = {
    id: string;
    type: string;
    attributes: {
        [k: string]: unknown;
    };
    relationships: {
        [k: string]: Ref | Ref[] | null;
    };
};
export type Graph = {
    [k: string]: {
        [k: string]: NormalResource;
    };
};
export declare function createEmptyGraph(schema: Schema): Graph;
export declare function emptyGraph(schema: Schema): Graph;
export declare function linkInverses(graph: Graph, schema: Schema): Graph;
export declare function mergeGraphs(left: Graph, right: Graph): Graph;
//# sourceMappingURL=graph.d.ts.map