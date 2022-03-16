import { pick } from "@polygraph/utils";

export function selectProperties(resource, next, { query, schema }) {
  const { properties, relationships } = query;
  const idField = schema.resources[query.type].idField ?? "id";
  const fields = [idField, ...properties, ...Object.keys(relationships)];

  return next(pick(resource, fields));
}
