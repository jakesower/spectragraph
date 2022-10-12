export function getInverse(schema, relationshipPropertyDefinition) {
  const { inverse, relatedType } = relationshipPropertyDefinition;
  return schema.resources[relatedType].properties[inverse];
}
