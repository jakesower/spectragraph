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
export declare function emptyGraph(schema: Schema): Graph;
export declare function linkInverses(graph: Graph, schema: Schema): Graph;
export declare function mergeGraphs(left: Graph, right: Graph): Graph;
//# sourceMappingURL=graph.d.ts.map