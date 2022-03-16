import { mapObj } from "@polygraph/utils";
import { multiApply } from "../../utils/multi-apply.mjs";
import { applyOperations } from "./apply-operations.mjs"; // eslint-disable-line import/no-cycle

export function expandRelated(resource, next, context) {
  const { dereference, query } = context;

  if (!query.relationships) return next(resource);

  const relationships = mapObj(query.relationships,
    (subQuery, relKey) => applyOperations(
      multiApply(resource[relKey], dereference),
      { ...context, query: subQuery },
    ),
  );

  return next({
    ...resource,
    ...relationships,
  });
}
