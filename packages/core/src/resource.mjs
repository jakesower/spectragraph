import { mapObj, partitionObj, pick } from "@polygraph/utils/objects";

export function defaultResource(schema, resourceType) {
  return mapObj(schema.resources[resourceType].properties, (propDef) =>
    propDef.type === "relationship"
      ? propDef.cardinality === "one"
        ? null
        : []
      : propDef.default,
  );
}

export function normalizeResource(schema, type, resource) {
  const [propKeys, relKeys] = partitionObj(
    schema.resources[type],
    (propDef) => propDef.type === "relationship",
  );

  return {
    type,
    id: resource.id,
    properties: pick(resource, propKeys),
    relationships: pick(resource, relKeys),
  };
}
