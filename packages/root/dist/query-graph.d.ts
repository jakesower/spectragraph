import { RootQuery } from "./query.js";
export type Result = {
    [k: string]: unknown;
};
type Ref = {
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
        [k: string]: Ref | Ref[];
    };
};
export type NormalResources = {
    [k: string]: {
        [k: string | number]: NormalResource;
    };
};
type QueryGraph = {
    query: <Q extends RootQuery>(query: Q) => Result;
};
export declare function createQueryGraph(resources: NormalResources): QueryGraph;
export declare function queryGraph<Q extends RootQuery>(resources: NormalResources, query: Q): Result;
export {};
//# sourceMappingURL=query-graph.d.ts.map