import { ResourceRef, Schema } from "../types";

export function cardinalize<
  S extends Schema,
  ResType extends keyof S["resources"] & string,
  CardType extends { cardinality: "one" | "many" },
>(
  rels: ResourceRef<S, ResType>[],
  relDef: CardType,
): ResourceRef<S, ResType> | ResourceRef<S, ResType>[] {
  return relDef.cardinality === "one"
    ? rels.length === 0 ? null : rels[0]
    : rels;
}
