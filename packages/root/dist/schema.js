import { mapValues } from "lodash-es";
export function normalizeResource(resourceType, resource, schema, mappers) {
    const resSchema = schema.resources[resourceType];
    const attributes = mapValues(resSchema.attributes, (_, attr) => mappers[attr] && typeof mappers[attr] === "function"
        ? mappers(resource)
        : mappers[attr]
            ? resource[mappers[attr]]
            : resource[attr]);
    const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
        if (mappers[rel] && typeof mappers[rel] === "function")
            return mappers(resource);
        const emptyRel = relSchema.cardinality === "many" ? [] : null;
        const id = mappers.id ? resource[mappers.id] : resource.id;
    });
    const idField = mappers.id ?? "id";
    return {
        id: resource[idField],
        type: resourceType,
        attributes,
        relationships,
    };
}
// export function normalizeResources(
// 	resourceType: string,
// 	resources: Resource[],
// 	schema: Schema,
// 	mappers = {},
// ): NormalResources {
// 	const resSchema = schema.resources[resourceType];
// }
