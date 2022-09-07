import { coreExpressions } from "./expressions.js";

export function makeEmptyStore(schema) {
  const resources = {};
  const resTypes = Object.keys(schema.resources);

  resTypes.forEach((resourceName) => {
    resources[resourceName] = {};
  });

  return resources;
}

export const defaultStoreOptions = {
  expressionDefinitions: coreExpressions,
  orderingFunctions: {},
};
