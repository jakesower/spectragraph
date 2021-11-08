import { ResourceRef, Schema } from "../types";

export const formatRef = <S extends Schema>(ref: ResourceRef<S>): string => `(${ref.type}, ${ref.id})`;
