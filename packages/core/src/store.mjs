export function makeEmptyStore(schema) {
  const resources = {};
  const resTypes = Object.keys(schema.resources);
  resTypes.forEach((resourceName) => {
    resources[resourceName] = {};
  });

  return resources;
}
