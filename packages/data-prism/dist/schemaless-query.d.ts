export type Expression = {
    [k: string]: unknown;
};
export type SchemalessQuery = {
    id?: string;
    limit?: number;
    offset?: number;
    order?: {
        [k: string]: "asc" | "desc";
    } | {
        [k: string]: "asc" | "desc";
    }[];
    select: readonly (string | {
        [k: string]: string | SchemalessQuery | Expression;
    })[] | {
        [k: string]: string | SchemalessQuery | Expression;
    };
    type?: string;
    where?: {
        [k: string]: unknown;
    };
};
export type RootSchemalessQuery = SchemalessQuery & {
    type: string;
};
export type NormalSchemalessQuery = SchemalessQuery & {
    select: {
        [k: string]: string | NormalSchemalessQuery | Expression;
    };
    order?: {
        [k: string]: "asc" | "desc";
    }[];
};
export type NormalRootSchemalessQuery = RootSchemalessQuery & NormalSchemalessQuery;
export type SchemalessQueryInfo = {
    path: string[];
    parent: SchemalessQuery | null;
};
export declare function normalizeSchemalessQuery(rootSchemalessQuery: RootSchemalessQuery): NormalRootSchemalessQuery;
export declare function forEachSchemalessQuery(query: any, fn: any): void;
export declare function mapSchemalessQuery(query: any, fn: any): any;
export declare function reduceSchemalessQuery(query: any, fn: any, init: any): any;
//# sourceMappingURL=schemaless-query.d.ts.map