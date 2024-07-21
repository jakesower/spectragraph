import { mapValues, pickBy } from "lodash-es";
import { applyOrMap } from "@data-prism/utils";
export function flattenResource(resourceId, resource, idField = "id") {
    const relationships = mapValues(resource.relationships, (_, relName) => applyOrMap(resource.relationships[relName], ({ id }) => id));
    return {
        [idField]: resourceId,
        ...resource.attributes,
        ...relationships,
    };
}
export function normalizeResource(resourceType, resource, schema, graphMappers = {}) {
    const resSchema = schema.resources[resourceType];
    const resourceMappers = graphMappers[resourceType] ?? {};
    const attributes = mapValues(resSchema.attributes, (_, attr) => {
        const mapper = resourceMappers[attr];
        return typeof mapper === "function"
            ? mapper(resource)
            : mapper
                ? resource[mapper]
                : resource[attr];
    });
    const relationships = mapValues(resSchema.relationships, (relSchema, rel) => {
        const relMapper = graphMappers[relSchema.type] ?? {};
        const relResSchema = schema.resources[relSchema.type];
        const mapper = resourceMappers[rel];
        const emptyRel = relSchema.cardinality === "many" ? [] : null;
        const relIdField = relMapper.id ?? relResSchema.idField ?? "id";
        const relVal = typeof mapper === "function"
            ? mapper(resource)
            : mapper
                ? resource[mapper]
                : resource[rel];
        if (relVal === undefined)
            return undefined;
        return applyOrMap(relVal ?? emptyRel, (relRes) => typeof relRes === "object"
            ? { type: relSchema.type, id: relRes[relIdField] }
            : { type: relSchema.type, id: relRes });
    });
    return {
        attributes: pickBy(attributes, (a) => a !== undefined),
        relationships: pickBy(relationships, (r) => r !== undefined),
    };
}
function mergeResources(left, right = { attributes: {}, relationships: {} }) {
    return {
        ...left,
        attributes: { ...left.attributes, ...right.attributes },
        relationships: { ...left.relationships, ...right.relationships },
    };
}
export function createGraphFromTrees(rootResourceType, rootResources, schema, graphMappers = {}) {
    const output = mapValues(schema.resources, () => ({}));
    const go = (resourceType, resource) => {
        const resourceSchema = schema.resources[resourceType];
        const resourceMappers = graphMappers[resourceType] ?? {};
        const idField = resourceMappers.id ?? resourceSchema.idField ?? "id";
        const resourceId = resource[idField];
        output[resourceType][resourceId] = mergeResources(normalizeResource(resourceType, resource, schema, graphMappers), output[resourceType][resourceId]);
        Object.entries(resourceSchema.relationships).forEach(([relName, relSchema]) => {
            const mapper = resourceMappers[relName];
            const emptyRel = relSchema.cardinality === "many" ? [] : null;
            const relVal = typeof mapper === "function"
                ? mapper(resource)
                : mapper
                    ? resource[mapper]
                    : resource[relName];
            return applyOrMap(relVal ?? emptyRel, (relRes) => {
                if (typeof relRes === "object")
                    go(relSchema.type, relRes);
            });
        });
    };
    rootResources.forEach((r) => {
        go(rootResourceType, r);
    });
    return output;
}
