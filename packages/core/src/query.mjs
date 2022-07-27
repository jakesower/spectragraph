export { normalizeGetQuery, normalizeSetQuery } from "./query/normalize-query.mjs";
export { queryTree } from "./query/query-tree.mjs";

export function flatMapQuery(query, fn) {
  const go = (subQuery, path) => {
    const nodeResult = fn(subQuery, path);
    const relResults = Object.entries(subQuery.relationships).flatMap(
      ([relKey, relQuery]) => go(relQuery, [...path, relKey]),
    );

    return [nodeResult, ...relResults].flat();
  };

  return go(query, []);
}

export function flatMapQueryTree(query, tree, fn) {
  const go = (subQuery, subTree, path) => {
    const nodeResult = fn(subQuery, subTree, path);
    const relResults = Object.entries(subQuery.relationships).flatMap(
      ([relKey, relQuery]) => go(relQuery, subTree?.[relKey], [...path, relKey]),
    );

    return [nodeResult, ...relResults];
  };

  return go(query, tree, []);
}

export function flattenSubQueries(query) {
  return [query, ...Object.values(query.relationships).map(flattenSubQueries)];
}
