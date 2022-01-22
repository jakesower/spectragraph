/* eslint-disable @typescript-eslint/no-explicit-any */

import { pick } from "@polygraph/utils";

export { asArray } from "./asArray";
export { cardinalize } from "./cardinalize";
export { denormalizeResource } from "./denormalize-resource";
export { formatRef } from "./format-ref";
export { normalizeResource } from "./normalize-resource";
export { queryTree } from "./query-tree";
export { setRelationships } from "./set-relationships";

// please let tuples/records come soon
export const refsEqual = (left, right) => (
  left.type === right.type && left.id === right.id
);

export const toRef = (ref) => pick(ref, ["id", "type"]);
