import { denormalizeQuery, mapQuery, normalizeGetQuery } from "@polygraph/core/query";
import { flattenQueryTree, normalizeTree } from "@polygraph/core/tree";
import { asArray } from "@polygraph/utils/arrays";
import { pick } from "@polygraph/utils/objects";
import { pipeThru, pipeThruWithContext } from "@polygraph/utils/pipes";

// things to do:
// - wrap/unwrap HTTP stuff
// - extract query arguments from URL
// - format res trees as json api responses

export function JsonApiAdapter(schema, store) {
  const formatResource = (res) => ({
    ...pick(res, ["id", "type"]),
    ...(Object.keys(res.properties).length > 0 ? { attributes: res.properties } : {}),
  });

  const buildQueryShape = (params) => {
    if (!params.include) return {};

    const { include } = params;

    const includePaths = include.split(",").map((item) => item.split("."));
    const go = (subObj, subPath) => {
      const [head, ...tail] = subPath;

      return subPath.length === 0
        ? subObj ?? {}
        : { ...subObj, relationships: { [head]: go(subObj[head], tail) } };
    };

    return includePaths.reduce(go, {});
  };

  const queryNodeBuilders = {
    properties: (subQuery, subQueryPath, { params }) => {
      const fields = params.fields?.[subQuery.type];
      if (!fields) return subQuery;

      return {
        ...subQuery,
        properties: fields,
      };
    },
    relationships: (subQuery, subQueryPath, { params }) => {
      
    }
  };

  const queryBuilders = {
    applyNodeBuilders: (curQuery, context) => {
      const builderFns = Object.values(queryNodeBuilders);
      const normal = normalizeGetQuery(schema, curQuery);
      console.log({ normal });

      return mapQuery(normal, (subQuery, subQueryPath) => {
        const pipeFns = builderFns.map(
          (builderFn) => (sq) => builderFn(sq, subQueryPath, context),
        );
        console.log("piped", pipeThru(subQuery, pipeFns));

        return pipeThru(subQuery, pipeFns);
      });
    },
  };

  const resultBuilders = {
    data: (result, { params, queryTrees }) => {
      const formatted = queryTrees.map(formatResource);
      return {
        ...result,
        data: params.id ? formatted[0] ?? null : formatted,
      };
    },
    included: (result, { params, queryTrees }) => {
      if (!("include" in params)) return result;

      const included = queryTrees.flatMap((normalTree) =>
        pipeThru(normalTree, [
          (tree) => Object.values(tree?.relationships).flat(),
          (relTrees) => relTrees.flatMap(flattenQueryTree),
          (trees) => trees.map(formatResource),
        ]),
      );

      return { ...result, included };
    },
  };

  return {
    get: async (req) => {
      const { params } = req;
      const skeletonQuery = {
        ...pick(params, ["type", "id"]),
        ...buildQueryShape(params),
      };

      // console.log("sq", skeletonQuery);

      const blossomQuery = await pipeThruWithContext(skeletonQuery, req, [
        ...Object.values(queryBuilders),
        denormalizeQuery,
      ]);
      // console.log("bq", blossomQuery);
      // console.log("bqr", blossomQuery.relationships);

      const blossomResults = await store.get(blossomQuery);

      console.log({ blossomQuery, blossomResults });

      const query = normalizeGetQuery(schema, blossomQuery);
      const queryTrees = asArray(blossomResults).flatMap((res) =>
        normalizeTree(query, res),
      );

      const jsonApiResult = await pipeThruWithContext(
        {},
        { query, queryTrees, ...req },
        Object.values(resultBuilders),
      );

      return jsonApiResult;
    },
  };
}
