import { ERRORS } from "../../strings.mjs";
import { BlossomError } from "../../validations/errors.mjs";
import { orderFunction } from "./order.mjs";

export function firstOperation(resources, { query }) {
  if (!query.first) return resources;

  if (!Array.isArray(resources)) {
    throw new BlossomError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  return resources[0];
}

export function firstOrderOperation(resources, { orderingFunctions, query, schema }) {
  if (!Array.isArray(resources)) {
    throw new BlossomError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  const fn = orderFunction({ orderingFunctions, query, schema });
  return resources.reduce((best, item) => (fn(best, item) > 0 ? item : best));
}
