/* eslint-disable @typescript-eslint/no-explicit-any */

import { pick } from "@polygraph/utils";
import { ResourceRef, Schema } from "../types";

export { asArray } from "./asArray";
export { cardinalize } from "./cardinalize";
export { denormalizeResource } from "./denormalize-resource";
export { formatRef } from "./format-ref";
export { normalizeResource } from "./normalize-resource";
export { queryTree } from "./query-tree";
export { setRelationships } from "./set-relationships";

// please let tuples/records come soon
export const refsEqual = (left: ResourceRef<any, any>, right: ResourceRef<any, any>): boolean => (
  left.type === right.type && left.id === right.id
);

export const toRef = <S extends Schema>(ref: ResourceRef<S, any>): ResourceRef<S, any> => (
  pick(ref as Record<string, unknown>, ["id", "type"]) as ResourceRef<S, any>
);
