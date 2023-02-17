import { mapValues } from "lodash-es";

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
	foreignType: string;
	foreignKey: string;
	cardinality: "one" | "many";
	inverseProperty: string;
};

export type Schema = {
	$schema?: string;
	$id?: string;
	title?: string;
	description?: string;
	meta?: any;
	version?: string;
	resources: {
		[k: string]: {
			properties: { [k: string]: SchemaProperty };
			relationships: { [k: string]: SchemaRelationship };
		};
	};
};

export function compileSchema(rawSchema) {
	const resources = mapValues(rawSchema.resources, (resDef) => ({
		idField: "id",
		...resDef,
	}));

	return { ...rawSchema, resources };
}
