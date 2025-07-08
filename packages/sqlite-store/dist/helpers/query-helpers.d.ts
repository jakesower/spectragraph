import { RootQuery, Schema } from "data-prism";
type QueryBreakdown<S extends Schema> = {
    path: string[];
    attributes: any;
    relationships: any;
    type: string & keyof S["resources"];
}[];
export declare function flattenQuery<S extends Schema>(schema: S, rootQuery: RootQuery<S>): QueryBreakdown<S>;
export {};
//# sourceMappingURL=query-helpers.d.ts.map