import { ResourceRef, Schema } from "../types";

export function makeRefKey<S extends Schema, RT extends keyof S["resources"] & string>(ref: ResourceRef<S, RT>): string {
  const { type, id } = ref;
  return JSON.stringify({ type, id });
}
