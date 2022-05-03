export function denormalizeResource(normalResource) {
  return normalResource
  && {
    id: normalResource.id,
    ...normalResource.properties,
    ...normalResource.relationships,
  };
}
