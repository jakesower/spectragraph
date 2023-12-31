import { RootQuery } from "../query.js";
import { Graph } from "../graph.js";
export type Result = {
    [k: string]: unknown;
};
type QueryGraph = {
    query: <Q extends RootQuery>(query: Q) => Result;
};
export declare function createQueryGraph(graph: Graph): QueryGraph;
export declare function queryGraph<Q extends RootQuery>(graph: Graph, query: Q): Result;
export {};
//# sourceMappingURL=query.d.ts.map