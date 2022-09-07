import { asArray } from "@blossom/utils/arrays";
import { mapObj, pick } from "@blossom/utils/objects";

export function normalizeTree(query, treeOrTrees) {
  return asArray(treeOrTrees).map((tree) => {
    const properties = pick(tree, query.args.properties);
    const relationships = mapObj(query.args.relationships ?? {}, (subquery, relKey) =>
      normalizeTree(subquery, tree[relKey]),
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
