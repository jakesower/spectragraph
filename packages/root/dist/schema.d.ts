import { NormalResource } from "./query-graph";
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
export declare function normalizeResource(resourceType: string, resource: {
    [k: string]: any;
}, schema: Schema, mappers: any): NormalResource;
export {};
//# sourceMappingURL=schema.d.ts.map