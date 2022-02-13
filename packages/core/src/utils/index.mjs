/* eslint-disable @typescript-eslint/no-explicit-any */

import { pick } from "@polygraph/utils";

export { asArray } from "./asArray.mjs";
export { cardinalize } from "./cardinalize.mjs";
export { denormalizeResource } from "./denormalize-resource.mjs";
export { formatRef } from "./format-ref.mjs";
export { normalizeResource } from "./normalize-resource.mjs";
export { queryTree } from "./query-tree.mjs";
export { setRelationships } from "./set-relationships.mjs";

// please let tuples/records come soon
export const refsEqual = (left, right) => (
  left.type === right.type && left.id === right.id
);

export const toRef = (ref) => pick(ref, ["id", "type"]);
