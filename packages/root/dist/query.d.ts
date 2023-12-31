export type Expression = {
    [k: string]: any;
};
export type Query = {
    id?: string;
    limit?: number;
    offset?: number;
    order?: {
        [k: string]: "asc" | "desc";
    } | {
        [k: string]: "asc" | "desc";
    }[];
    select: readonly (string | {
        [k: string]: string | Query | Expression;
    })[] | {
        [k: string]: string | Query | Expression;
    };
    type?: string;
    where?: {
        [k: string]: any;
    };
};
export type RootQuery = Query & {
    type: string;
};
export type NormalQuery = Query & {
    select: {
        [k: string]: string | NormalQuery | Expression;
    };
};
export type NormalRootQuery = RootQuery & NormalQuery;
export type QueryInfo = {
    path: string[];
    parent: Query | null;
};
export declare function normalizeQuery(rootQuery: RootQuery): NormalRootQuery;
export declare function forEachSchemalessQuery(query: any, fn: any): void;
export declare function mapSchemalessQuery(query: any, fn: any): any;
export declare function reduceSchemalessQuery(query: any, fn: any, init: any): any;
//# sourceMappingURL=query.d.ts.map