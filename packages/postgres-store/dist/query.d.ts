import { RootQuery, Schema } from "data-prism";
export type StoreContext = {
    schema: Schema;
    query: RootQuery;
    config: any;
};
export declare const SQL_CLAUSE_CONFIG: {
    [k: string]: {
        initVal: any;
        toSql: (val: any) => string;
        compose: (left: any, right: any) => any;
    };
};
export declare function replacePlaceholders(inputString: any): any;
export declare function query(query: RootQuery, context: StoreContext): Promise<import("../../data-prism/dist/graph/query-graph.js").Result>;
//# sourceMappingURL=query.d.ts.map