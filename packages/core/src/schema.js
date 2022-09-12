import { filterObj, mapObj } from "@taxonic/utils/objects";

export function compileSchema(rawSchema) {
  const resources = mapObj(rawSchema.resources, (resDef) => ({
    idField: "id",
    ...resDef,
  }));

  return { ...rawSchema, resources };
}

export function getInverse(schema, relationshipPropertyDefinition) {
  const { inverse, relatedType } = relationshipPropertyDefinition;
  return schema.resources[relatedType].properties[inverse];
}

export function getRelationshipProperties(schema, resourceType) {
  return filterObj(
    schema.resources[resourceType].properties,
    (prop) => prop.type === "relationship",
  );
}
