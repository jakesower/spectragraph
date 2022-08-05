import { filterObj } from "@blossom/utils/objects";

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
