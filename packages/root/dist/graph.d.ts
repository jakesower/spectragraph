import { Schema } from "./schema.js";
import { Graph } from "./memory-store.js";
export { createQueryGraph, queryGraph } from "./graph/query-graph.js";
export type Ref = {
    type: string;
    id: string;
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
export declare function createEmptyGraph(schema: Schema): Graph;
export declare function emptyGraph(schema: Schema): Graph;
export declare function linkInverses(graph: Graph, schema: Schema): Graph;
export declare function mergeGraphs(left: Graph, right: Graph): Graph;
//# sourceMappingURL=graph.d.ts.map