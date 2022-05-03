export function cardinalize(rels, relDef) {
  return relDef.cardinality === "one"
    ? rels.length === 0 ? null : rels[0]
    : rels;
}
