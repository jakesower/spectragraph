/* eslint-disable @typescript-eslint/no-explicit-any */

import { mapObj, pick } from "@polygraph/utils";
import {
  CompiledQuery,
  CompiledSchema,
  DataTree, ExpandedResourceTree, Query, SubQuery, ResourceRef, ResourceTree, Schema,
} from "../types";

export { asArray } from "./asArray";
export { compileQuery } from "./compileQuery";
export { convertDataTreeToResourceTree } from "./convertDataTreeToResourceTree";
export { convertResourceTreeToDataTree } from "./convertResourceTreeToDataTree";

// please let tuples/records come soon
export const refsEqual = (left: ResourceRef<any>, right: ResourceRef<any>): boolean => (
  left.type === right.type && left.id === right.id
);

export const formatRef = <S extends Schema>(ref: ResourceRef<S>): string => `(${ref.type}, ${ref.id})`;

export const toRef = <S extends Schema>(ref: ResourceRef<S>): ResourceRef<S> => (
  pick(ref as Record<string, unknown>, ["id", "type"]) as ResourceRef<S>
);
