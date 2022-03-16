import { pipeThruMiddleware, pipeThruMiddlewareDebug } from "@polygraph/utils";
import { applyConstraints } from "./apply-constraints.mjs";
import { expandRelated } from "./expand-related.mjs"; // eslint-disable-line import/no-cycle
import { selectProperties } from "./select-properties.mjs";

const multipleOnly = (fn) => (resOrRess, next, context) => (
  Array.isArray(resOrRess) ? fn(resOrRess, next, context) : next(resOrRess)
);

const perResource = (fn) => (resOrRess, next, context) => (
  Array.isArray(resOrRess)
    ? resOrRess.map((res) => fn(res, next, context))
    : resOrRess == null ? null : fn(resOrRess, next, context)
);

const sharedPipe = [
  multipleOnly(applyConstraints),
  perResource(expandRelated),
  perResource(selectProperties),
];

export function applyOperations(resourceOrResources, context) {
  return pipeThruMiddleware(
    resourceOrResources,
    context,
    sharedPipe,
  );
}
