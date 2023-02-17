import { mapValues } from "lodash-es";

type LooseSchemaProperty = {
	// type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null";
	type: string;
	title?: { type: "string" };
	description?: { type: "string" };
	default?: any;
	$comment?: { type: "string" };
	deprecated?: { type: "boolean" };
	meta?: any;
};

type LooseSchemaRelationship = {
	resource: string;
	// cardinality: "one" | "many";
	cardinality: string;
	inverse?: string;
};

type LooseSchemaResource = {
	properties: { [k: string]: LooseSchemaProperty };
	relationships: { [k: string]: LooseSchemaRelationship };
};

export type LooseSchema = {
	$schema?: string;
	$id?: string;
	title?: string;
	description?: string;
	meta?: any;
	version?: string;
	resources: { [k: string]: LooseSchemaResource };
};

type SchemaProperty = {
	type: "object" | "array" | "boolean" | "string" | "number" | "integer" | "null";
	title?: { type: "string" };
	description?: { type: "string" };
	default?: any;
	$comment?: { type: "string" };
	deprecated?: { type: "boolean" };
	meta?: any;
};

type SchemaRelationship = {
	resource: string;
	cardinality: "one" | "many";
	inverse?: string;
};

type SchemaResource = {
	properties: { [k: string]: SchemaProperty };
	relationships: { [k: string]: SchemaRelationship };
};

export type Schema = {
	$schema?: string;
	$id?: string;
	title?: string;
	description?: string;
	meta?: any;
	version?: string;
	resources: { [k: string]: SchemaResource };
};

export function compileSchema(rawSchema) {
	const resources = mapValues(rawSchema.resources, (resDef) => ({
		idField: "id",
		...resDef,
	}));

	return { ...rawSchema, resources };
}
