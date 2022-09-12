/* eslint-disable import/no-cycle */

import { intersperse, multiApply } from "@taxonic/utils/arrays";
import { getPath } from "@taxonic/utils/lenses";
import { mapObj } from "@taxonic/utils/objects";
import { TaxonicError, ERRORS } from "./errors.js";
import { buildOperationPipe, coreQueryPipe, coreResultsPipe } from "./operations.js";

import {
  denormalizeQuery,
  normalizeQuery,
  normalizeGetQuery,
  normalizeSetQuery,
} from "./query/normalize-query.js";

export { denormalizeQuery, normalizeQuery, normalizeGetQuery, normalizeSetQuery };
export { queryTree } from "./query/query-tree.js";

export function flatMapQuery(query, fn) {
  const go = (subquery, path) => {
    const nodeResult = fn(subquery, path);
    const relResults = Object.entries(subquery.relationships).flatMap(
      ([relKey, relQuery]) => go(relQuery, [...path, relKey]),
    );

    return [nodeResult, ...relResults].flat();
  };

  return go(query, []);
}

export function flatMapQueryTree(query, tree, fn) {
  const go = (subquery, subTree, path) => {
    const nodeResult = fn(subquery, subTree, path);
    const relResults = Object.entries(subquery.relationships).flatMap(
      ([relKey, relQuery]) =>
        multiApply(subTree?.[relKey], (rel) => go(relQuery, rel, [...path, relKey])),
    );

    return [nodeResult, ...relResults];
  };

  return go(query, tree, []);
}

export function flattenSubQueries(query) {
  return [query, ...Object.values(query.relationships).map(flattenSubQueries)];
}

export function getQueryPath(query, path) {
  return getPath(query, intersperse(path, "relationships"));
}

export function mapQuery(query, fn) {
  const go = (subquery, path) => {
    const nodeResult = fn(subquery, path);

    return {
      ...nodeResult,
      relationships: mapObj(nodeResult.relationships, (relQuery, relKey) =>
        go(relQuery, [...path, relKey]),
      ),
    };
  };

  return go(query, []);
}

export function compileQuery(query, storeContext) {
  return async () => {
    const { queryOperations, resultsOperations, run } = storeContext;

    const { apply: queryOperationsPipe, query: postQueryPipeQuery } = buildOperationPipe(
      query,
      [...(queryOperations ?? []), ...coreQueryPipe],
    );
    const { apply: resultsOperationsPipe, query: unhandledArguments } =
      buildOperationPipe(postQueryPipeQuery, [
        ...(resultsOperations ?? []),
        ...coreResultsPipe,
      ]);

    // TODO: compile subqueries here as well

    if (Object.keys(unhandledArguments.args).length > 0) {
      throw new TaxonicError(ERRORS.UNHANDLED_ARGUMENTS, unhandledArguments.args);
    }

    const context = {
      ...storeContext,
      config: { orderingFunctions: {} },
      query,
      queryOperationsPipe,
      resultsOperationsPipe,
    };

    if (storeContext.debug) {
      console.log("-----starting query run-----");
      console.log("---(query)---");
      console.log(query);
      console.log("---(context)---");
      console.log(context);
    }

    const storeQuery = queryOperationsPipe(query, context);
    const storeResults = await run(storeQuery);
    const taxonicResults = await resultsOperationsPipe(storeResults, context);

    return taxonicResults;
  };
}
