import { Graph, NormalResource } from "./graph.js";
export type Schema = {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    meta?: any;
    version?: string;
    resources: {
        [k: string]: SchemaResource;
    };
};
type SchemaAttribute = {
    type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null";
    title?: string;
    description?: string;
    default?: any;
    $comment?: string;
    deprecated?: boolean;
    meta?: any;
};
type SchemaRelationship = {
    type: string;
    cardinality: "one" | "many";
    inverse?: string;
    meta?: any;
};
type SchemaResource = {
    idField?: string;
    attributes: {
        [k: string]: SchemaAttribute;
    };
    relationships: {
        [k: string]: SchemaRelationship;
    };
};
type Mapper = string | ((res: any) => unknown);
type ResourceMappers = {
    [k: string]: Mapper;
};
type GraphMappers = {
    [k: string]: ResourceMappers;
};
export declare function flattenResource(resourceId: any, resource: any, idField?: string): any;
export declare function normalizeResource(resourceType: string, resource: {
    [k: string]: any;
}, schema: Schema, resourceMappers?: ResourceMappers): NormalResource;
export declare function normalizeResources(rootResourceType: string, rootResources: {
    [k: string]: any;
}[], schema: Schema, mappers?: GraphMappers): Graph;
export {};
//# sourceMappingURL=mappers.d.ts.map