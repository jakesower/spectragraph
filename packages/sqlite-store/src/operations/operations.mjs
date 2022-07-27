import { ERRORS, PolygraphError } from "@polygraph/core/errors";
import { compileExpression, isValidExpression } from "@polygraph/expressions";
import { coreOperations } from "@polygraph/core/operations";
import { flatMapQuery } from "@polygraph/core/query";
import { multiApply } from "@polygraph/utils/functions";
import { pipeThru } from "@polygraph/utils/pipes";
import { preQueryRelationships } from "./relationships.mjs";

const operations = {
  id: {
    preQuery: async (id, { query, schema }) => {
      const { table } = schema.resources[query.type].store;
      return { where: [`${table}.id = ?`], vars: [id] };
    },
    postQuery: (_, resources) => {
      if (!Array.isArray(resources)) {
        throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
      }

      return resources[0] ?? null;
    },
    incompatibeWith: ["first"],
  },
  ...coreOperations,
  // properties: {
  //   preQuery: (properties) =>
  // },
  first: {
    preQuery: (_, { queryPath }) =>
      queryPath.length === 0 ? [{ limit: 1, offset: 0 }] : [],
    postQuery: (_, resources) => {
      if (!Array.isArray(resources)) {
        throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
      }

      return resources[0] ?? null;
    },
    incompatibeWith: ["id"],
  },
  constraints: {
    preQuery: (constraints, context) => {
      const { config } = context;
      const { expressionDefinitions } = config;

      // an expression has been passed as the constraint value
      if (isValidExpression(constraints, expressionDefinitions)) {
        return compileExpression(constraints, expressionDefinitions, context)();
      }

      // an object of properties has been passed in
      const propExprs = Object.entries(constraints).map(([propKey, propValOrExpr]) => {
        if (isValidExpression(propValOrExpr, expressionDefinitions)) {
          const [operation, args] = Object.entries(propValOrExpr)[0];
          return { [operation]: [{ $prop: propKey }, args] };
        }

        return { $eq: [{ $prop: propKey }, propValOrExpr] };
      });

      const objectExpression = { $and: propExprs };
      return compileExpression(objectExpression, expressionDefinitions, context)();
    },
  },
  order: {
    preQuery: (order, { queryTable }) => [
      { orderBy: order.map((o) => ({ ...o, table: queryTable })) },
    ],
  },
  limit: {
    preQuery: (limit, { query, queryPath }) =>
      queryPath.length === 0 ? [{ limit, offset: query.offset ?? 0 }] : [],
    postQuery: (limit, resources, { query, queryPath }) => {
      const { offset = 0 } = query;
      const out = queryPath.length === 0 ? resources : resources.slice(offset, limit);
      // console.log({ limit, resources, query, queryPath, offset, out });
      return out;
    },
  },
  offset: {
    preQuery: (offset, { query }) => {
      if (!query.limit) {
        return [{ limit: -1, offset }];
      }
      return [];
    },
  },
  relationships: {
    preQuery: (_, context) =>
      preQueryRelationships(context.query, context.queryPath, context),
    // flatMapQuery(context.query, (subQuery, queryPath) =>
    //   preQueryRelationships(subQuery, queryPath, context),
    // ),
  },
};

const applyOverPaths = (resources, path, fn) => {
  if (path.length === 0) return fn(resources);

  const [head, ...tail] = path;
  return multiApply(resources, (resource) => ({
    ...resource,
    [head]: applyOverPaths(resource[head], tail, fn),
  }));
};

const gatherPreOperations = (query, context) =>
  flatMapQuery(query, (subQuery, queryPath) =>
    Object.entries(subQuery)
      .flatMap(([operationKey, operationArg]) => {
        const operation = operations[operationKey]?.preQuery;

        if (!operation) return null;

        const argContext = {
          ...context,
          query: subQuery,
          queryPath,
          queryTable: [query.type, ...queryPath].join("$"),
          rootQuery: query,
        };
        return operation(operationArg, argContext);
      })
      .filter(Boolean),
  );

const gatherPostOperationFunctions = (query, context) =>
  flatMapQuery(query, (subQuery, queryPath) =>
    Object.entries(subQuery)
      .map(([operationKey, operationArg]) => {
        const operation = operations[operationKey]?.postQuery;

        if (!operation) return null;

        const argContext = { ...context, queryPath };
        return (resources) =>
          applyOverPaths(resources, queryPath, (resource) =>
            operation(operationArg, resource, argContext),
          );
      })
      .filter(Boolean),
  );

export async function runQuery(query, context, run) {
  const queryModifierPromises = gatherPreOperations(query, context);
  const queryModifiers = await Promise.all(queryModifierPromises);
  // console.log(queryModifiers);

  const resources = await run(queryModifiers);

  const postOps = gatherPostOperationFunctions(query, context);

  return pipeThru(resources, postOps);
}
