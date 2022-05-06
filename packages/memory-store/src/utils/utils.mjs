export { asArray } from "./asArray.mjs";
export { cardinalize } from "./cardinalize.mjs";
export { normalizeQuery } from "./normalize-query.mjs";
export { denormalizeResource } from "./denormalize-resource.mjs";
export { formatRef } from "./format-ref.mjs";
export { multiApply } from "./multi-apply.mjs";
export { normalizeResource } from "./normalize-resource.mjs";
export { queryTree } from "./query-tree.mjs";
export { subsetsOfSets } from "./subsetsOfSets.mjs";

// please let tuples/records come soon
export const refsEqual = (left, right) => (
  left.type === right.type && left.id === right.id
);

export const toRef = (ref) => ({ id: ref.id, type: ref.type });
