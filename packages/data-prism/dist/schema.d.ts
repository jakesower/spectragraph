type SchemaAttribute = {
    type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null" | "date" | "time" | "date-time" | "iso-time" | "iso-date-time" | "duration" | "uri" | "uri-reference" | "uri-template" | "url" | "email" | "hostname" | "ipv4" | "ipv6" | "regex" | "uuid" | "json-pointer" | "relative-json-pointer" | "byte" | "int32" | "int64" | "float" | "double" | "password" | "binary" | "data-prism:geojson" | "data-prism:geojson-point";
    title?: string;
    description?: string;
    default?: unknown;
    $comment?: string;
    deprecated?: boolean;
    meta?: unknown;
    required?: boolean;
    subType?: string;
    [k: string]: unknown;
};
type SchemaRelationship = {
    type: string;
    cardinality: "one" | "many";
    inverse?: string;
    required?: boolean;
};
type SchemaResource = {
    idAttribute?: string;
    attributes: {
        [k: string]: SchemaAttribute;
    };
    relationships: {
        [k: string]: SchemaRelationship;
    };
};
export type Schema = {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    meta?: unknown;
    version?: string;
    resources: {
        [k: string]: SchemaResource;
    };
};
export declare function ensureValidSchema(schema: any): void;
export {};
//# sourceMappingURL=schema.d.ts.map