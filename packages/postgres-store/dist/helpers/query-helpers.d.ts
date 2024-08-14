import { Query, RootQuery, Schema } from "data-prism";
export type QueryBreakdown<S extends Schema> = {
    path: string[];
    attributes: any;
    relationships: any;
    type: string & keyof S["resources"];
    query: Query;
    ref: boolean;
    parentQuery: Query | null;
    parent: QueryBreakdown<S> | null;
    parentRelationship: string | null;
}[];
export declare function flattenQuery<S extends Schema>(schema: S, rootQuery: RootQuery): QueryBreakdown<S>;
//# sourceMappingURL=query-helpers.d.ts.map