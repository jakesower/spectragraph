export function getInverse(schema, relationshipPropertyDefinition) {
  console.log('>>', relationshipPropertyDefinition)
  const { inverse, relatedType } = relationshipPropertyDefinition;
  return schema.resources[relatedType].properties[inverse];
}
