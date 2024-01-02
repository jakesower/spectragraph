import { Graph, NormalResource } from "./graph.js";
import { Schema } from "./schema.js";
type Mapper = string | ((res: any) => unknown);
type ResourceMappers = {
    [k: string]: Mapper;
};
type GraphMappers = {
    [k: string]: ResourceMappers;
};
export declare function flattenResource(resourceId: any, resource: any, idField?: string): any;
export declare function normalizeResource(resourceType: string, resource: {
    [k: string]: unknown;
}, schema: Schema, resourceMappers?: ResourceMappers): NormalResource;
export declare function createGraphFromTrees(rootResourceType: string, rootResources: {
    [k: string]: unknown;
}[], schema: Schema, graphMappers?: GraphMappers): Graph;
export {};
//# sourceMappingURL=mappers.d.ts.map