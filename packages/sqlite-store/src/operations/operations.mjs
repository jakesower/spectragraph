import { ERRORS, PolygraphError } from "@polygraph/core/errors";
import { compileExpression } from "@polygraph/core/expressions";
import { coreOperations } from "@polygraph/core/operations";
import { pipeThruMiddleware } from "@polygraph/utils/pipes";
import { firstOperation } from "./first.mjs";

const operations = {
  id: {
    apply: async (conditions, next, { query, schema }) => {
      if (!query.id) return next(conditions);

      const { table } = schema.resources[query.type].store;
      const result = await next([
        ...conditions,
        { where: [`${table}.id = ?`], vars: [query.id] },
      ]);

      if (!Array.isArray(result)) {
        throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
      }

      return result[0] ?? null;
    },
    incompatibeWith: ["first"],
  },
  ...coreOperations,
  first: {
    apply: firstOperation,
    incompatibeWith: ["id"],
  },
  constraints: {
    apply: async (conditions, next, context) => {
      const { config, query } = context;
      const { constraints } = query;
      const { expressionDefinitions } = config;

      if (!query) return next(conditions);

      const isExpression = (value) =>
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        Object.keys(value)[0] in expressionDefinitions;

      // an expression has been passed as the constraint value
      if (isExpression(constraints)) {
        const constraintConditions = compileExpression(
          config.expressionDefinitions,
          query.constraints,
          context,
        )();

        return next([...conditions, constraintConditions]);
      }

      // an object of properties has been passed in
      const propExprs = Object.entries(constraints).map(([propKey, propValOrExpr]) =>
        isExpression(propValOrExpr)
          ? { [propKey]: [{ $prop: propKey }, ...propValOrExpr] }
          : { $eq: [{ $prop: propKey }, propValOrExpr] },
      );

      const objectExpression = { $and: propExprs };
      const constraintConditions = compileExpression(
        config.expressionDefinitions,
        objectExpression,
        context,
      )();

      const resources = next([...conditions, constraintConditions]);

      return resources;
    },
  },
  order: {
    apply: (conditions, next, context) => {
      const { query } = context;
      if (!("order" in query)) return next(conditions);

      return next([...conditions, { orderBy: query.order }]);
    },
  },
  limit: {
    apply: (conditions, next, { query }) => {
      if (!("limit" in query) && !("offset" in query)) return next(conditions);

      const modifier = { limit: query.limit ?? -1, offset: query.offset ?? 0 };

      return next([...conditions, modifier]);
    },
  },
};

export function runQuery(initModifiers, context, run) {
  return pipeThruMiddleware(initModifiers, context, [
    ...Object.values(operations).map((op) => op.apply),
    run,
  ]);
}
