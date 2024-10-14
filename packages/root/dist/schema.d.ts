type SchemaAttribute = {
    type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null";
    title?: string;
    description?: string;
    default?: unknown;
    $comment?: string;
    deprecated?: boolean;
    meta?: unknown;
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
export {};
//# sourceMappingURL=schema.d.ts.map