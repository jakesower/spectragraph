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
export type CompiledQuery = Query & {
    select: {
        [k: string]: string | CompiledQuery;
    };
};
export type CompiledRootQuery = RootQuery & CompiledQuery;
export declare function compileQuery(rootQuery: any): CompiledRootQuery;
//# sourceMappingURL=query.d.ts.map