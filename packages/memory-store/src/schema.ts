/* eslint-disable no-use-before-define */
import { mapValues } from "lodash-es";

type LooseSchemaProperty = {
	type: string;
	title?: string;
	description?: string;
	default?: any;
	$comment?: string;
	deprecated?: boolean;
	meta?: any;
};

type LooseSchemaRelationship = {
	readonly resource: string;
	// readonly cardinality: "one" | "many";
	readonly cardinality: string;
	readonly inverse?: string;
};

type LooseSchemaResource = {
	idField?: string;
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
	title?: string;
	description?: string;
	default?: any;
	$comment?: string;
	deprecated?: boolean;
	meta?: any;
};

type SchemaRelationship = {
	resource: string;
	cardinality: "one" | "many";
	inverse?: string;
};

type SchemaResource = {
	idField: string;
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

function ensureValidSchema(schema) {
	// TODO
}

export function compileSchema(rawSchema: LooseSchema): Schema {
	const resources = mapValues(rawSchema.resources, (resDef) => ({
		idField: "id",
		...resDef,
	}));

	return { ...rawSchema, resources } as unknown as Schema;
}
