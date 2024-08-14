import { mapValues } from "lodash-es";
import { CanonicalResource, CanonicalResources } from "./query-graph";

export type Schema = {
	$schema?: string;
	$id?: string;
	title?: string;
	description?: string;
	meta?: any;
	version?: string;
	resources: { [k: string]: SchemaResource };
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
	idAttribute?: string;
	attributes: { [k: string]: SchemaAttribute };
	relationships: { [k: string]: SchemaRelationship };
};

type Resource = { [k: string]: any };

export function canonicalizeResource(
	resourceType: string,
	resource: object,
	schema: Schema,
	mappers,
): CanonicalResource {
	const resSchema = schema.resources[resourceType];

	const attributes = mapValues(resSchema.attributes, (_, attr) =>
		mappers[attr] && typeof mappers[attr] === "function"
			? mappers(resource)
			: mappers[attr]
				? resource[mappers[attr]]
				: resource[attr],
	);

	const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
		if (mappers[rel] && typeof mappers[rel] === "function") return mappers(resource);

		const emptyRel = relSchema.cardinality === "many" ? [] : null;
		const id = mappers.id ? resource[mappers.id] : resource.id;
	});

	const idAttribute = mappers.id ?? "id";

	return {
		id: resource[idAttribute],
		type: resourceType,
		attributes,
		relationships,
	};
}

export function canonicalizeResources(
	resourceType: string,
	resources: Resource[],
	schema: Schema,
	mappers = {},
): CanonicalResources {
	const resSchema = schema.resources[resourceType];
}
