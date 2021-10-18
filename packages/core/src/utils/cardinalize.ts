import { ResourceRefOfType, Schema } from "../types";

export function cardinalize<
  S extends Schema,
  ResType extends keyof S["resources"] & string,
  CardType extends { cardinality: "one" | "many" },
>(
  rels: ResourceRefOfType<S, ResType>[],
  relDef: CardType,
): ResourceRefOfType<S, ResType> | ResourceRefOfType<S, ResType>[] {
  return relDef.cardinality === "one"
    ? rels.length === 0 ? null : rels[0]
    : rels;
}
