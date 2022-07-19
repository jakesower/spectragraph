import { ERRORS, PolygraphError } from "@polygraph/core/errors";
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
  },
  first: {
    apply: firstOperation,
    incompatibilities: ["id"],
  },
};

export function runQuery(initModifiers, context, run) {
  return pipeThruMiddleware(initModifiers, context, [
    ...Object.values(operations).map((op) => op.apply),
    run,
  ]);
}
