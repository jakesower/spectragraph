import { asArray } from "@polygraph/utils/arrays";
import { mapObj, pick } from "@polygraph/utils/objects";

export function normalizeTree(query, treeOrTrees) {
  return asArray(treeOrTrees).map((tree) => {
    const properties = pick(tree, query.properties);
    const relationships = mapObj(query.relationships ?? {}, (subQuery, relKey) =>
      normalizeTree(subQuery, tree[relKey]),
    );

    return {
      id: tree.id,
      type: query.type,
      properties,
      relationships,
    };
  });
}

export function flattenQueryTree(tree) {
  return [tree, ...Object.values(tree.relationships ?? {}).flatMap(flattenQueryTree)];
}
