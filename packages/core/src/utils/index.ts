/* eslint-disable @typescript-eslint/no-explicit-any */

import { pick } from "@polygraph/utils";
import { ResourceRef, Schema } from "../types";

export { asArray } from "./asArray";
export { cardinalize } from "./cardinalize";
export { formatRef } from "./format-ref";
export { formatValidationError } from "./format-validation-error";
export { queryTree } from "./query-tree";
export { setRelationships } from "./set-relationships";

// please let tuples/records come soon
export const refsEqual = (left: ResourceRef<any>, right: ResourceRef<any>): boolean => (
  left.type === right.type && left.id === right.id
);

export const toRef = <S extends Schema>(ref: ResourceRef<S>): ResourceRef<S> => (
  pick(ref as Record<string, unknown>, ["id", "type"]) as ResourceRef<S>
);
