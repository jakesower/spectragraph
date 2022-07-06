import { mapObj } from "@polygraph/utils/objects";

export function defaultResource(schema, resourceType) {
  return mapObj(schema.resources[resourceType].properties, (propDef) =>
    propDef.type === "relationship"
      ? propDef.cardinality === "one"
        ? null
        : []
      : propDef.default,
  );
}
