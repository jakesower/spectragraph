import { ResourceRef } from "./types";

export const applyMapOrNull = (value, fn) =>
  value == null ? null : Array.isArray(value) ? value.map(fn) : fn(value);

// please let tuples/records come soon
export const refsEqual = (left: ResourceRef, right: ResourceRef): boolean =>
  left.type === right.type && left.id === right.id;

export const refStr = (ref: ResourceRef): string => `(${ref.type}, ${ref.id})`;
