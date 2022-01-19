import { ResourceRef, Schema } from "../types";

export const formatRef = <S extends Schema, RT extends keyof S["resources"]>
  (ref: ResourceRef<S, RT>): string => `(${ref.type}, ${ref.id})`;
