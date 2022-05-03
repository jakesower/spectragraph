import { ERRORS } from "../../strings.mjs";
import { PolygraphError } from "../../validations/errors.mjs";

export function first(resources, { query }) {
  if (!query.first) return resources;

  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  return resources[0];
}
