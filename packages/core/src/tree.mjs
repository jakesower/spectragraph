import { asArray } from "@polygraph/utils/arrays";
import { multiApply } from "@polygraph/utils/functions";
import { mapObj, pick } from "@polygraph/utils/objects";

export function mapTreeWithQuery(rootQuery, trees, fn) {
  const go = (query, subTree, path) => {
    if (subTree === undefined) return undefined;

    const nodeResult = fn(query, subTree, path);
    const relResults = mapObj(query.relationships, (relQuery, relKey) =>
      typeof nodeResult?.[relKey] === "object"
        ? multiApply(nodeResult[relKey], (relTree) =>
          go(relQuery, relTree, [...path, relKey]),
        )
        : nodeResult?.[relKey],
    );

    return { ...nodeResult, ...relResults };
  };

  return multiApply(trees, (subTree) => go(rootQuery, subTree, []));
}

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
