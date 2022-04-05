import { pick } from "@polygraph/utils";
import { multiApply } from "../../utils/multi-apply.mjs";

export function selectProperties(resources, { query, schema }) {
  return multiApply(resources, (resource) => {
    const { properties, relationships } = query;
    const idField = schema.resources[query.type].idField ?? "id";
    const fields = [idField, ...properties, ...Object.keys(relationships)];

    return pick(resource, fields);
  });
}
