import { Schema } from "./schema";
export type Expression = {
    [k: string]: unknown;
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
        [k: string]: unknown;
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
type ParentQueryInfo<S extends Schema> = QueryInfo & {
    type: string & keyof S["resources"];
};
export type SchemaQueryInfo<S extends Schema> = ParentQueryInfo<S> & {
    attributes: string[];
    relationships: {
        [k: string]: Query;
    };
};
export declare function normalizeQuery(rootQuery: RootQuery): NormalRootQuery;
export declare function forEachSchemalessQuery(query: any, fn: any): void;
export declare function mapSchemalessQuery(query: any, fn: any): any;
export declare function reduceSchemalessQuery(query: any, fn: any, init: any): any;
export declare function forEachQuery<S extends Schema>(schema: S, query: RootQuery, fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown): void;
export declare function mapQuery<S extends Schema>(schema: S, query: RootQuery, fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown): any;
export declare function reduceQuery<S extends Schema, T>(schema: S, query: RootQuery, fn: (acc: T, subquery: Query, info: SchemaQueryInfo<S>) => T, init: T): any;
export {};
//# sourceMappingURL=query.d.ts.map