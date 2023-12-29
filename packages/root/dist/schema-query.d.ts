import { Query, QueryInfo, RootQuery } from "./query";
import { Schema } from "./schema";
export type SchemaQueryInfo<S extends Schema> = QueryInfo & {
    type: string & keyof S["resources"];
};
export declare function forEachSchemaQuery<S extends Schema>(schema: S, query: RootQuery, fn: (subquery: Query, info: SchemaQueryInfo<S>) => unknown): void;
export declare function reduceSchemaQuery<S extends Schema, T>(schema: S, query: RootQuery, fn: (acc: T, subquery: Query, info: SchemaQueryInfo<S>) => T, init: T): any;
//# sourceMappingURL=schema-query.d.ts.map