import { mapObj } from "@blossom/utils/objects";

export function QueryTreeCollection(query, treeCollection) {
  const children = mapObj(query.relationships, (relQuery, relName) =>
    QueryTreeCollection(relQuery, treeCollection[relName]),
  );

  return {
    query,
    treeCollection,
    trees: treeCollection,
    children,
    map(fn) {
      return {
        ...fn(this),
        relationships: mapObj(this.children, (relQueryTree) => relQueryTree.map(fn)),
      };
    },
  };
}
