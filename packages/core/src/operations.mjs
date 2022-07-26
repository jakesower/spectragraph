import { sortBy } from "@polygraph/utils";
import { ERRORS, PolygraphError } from "./errors.mjs";
import { compileExpression, makeIsExpression } from "./expressions.mjs";

const compareFns = {
  integer: (left, right) => left - right,
  number: (left, right) => left - right,
  string: (left, right) => left.localeCompare(right),
};

export function orderFunction({ config, query, schema }) {
  const { order, type: resType } = query;
  const { orderingFunctions } = config;

  const fns = order.map((orderConfig) => {
    const { direction, function: fn, property } = orderConfig;
    const propDef = schema.resources[resType].properties[property];

    const fnFromConfig = fn ? orderingFunctions[fn] : compareFns[propDef.type];

    const fnWithProperty = property
      ? (left, right) => fnFromConfig(left[property], right[property])
      : fnFromConfig;

    return direction === "asc"
      ? fnWithProperty
      : (left, right) => fnWithProperty(right, left);
  });

  return (left, right) => {
    for (let i = 0; i < fns.length; i += 1) {
      const v = fns[i](left, right);
      if (v !== 0) return v;
    }
    return 0;
  };
}

async function orderOperation(vars, next, context) {
  if (!("order" in context.query) || context.query.order.length === 0) {
    return next(vars);
  }

  const resources = await next(vars);

  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  // SELECT cols mean sort fields might be omitted
  console.log({ context, resources, query: context.query });
  return sortBy(resources, orderFunction(context));
}

async function firstOperation(vars, next, { query }) {
  if (!query.first) return next(vars);

  const resources = await next(vars);

  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
  }

  return resources[0];
}

export const coreOperations = {
  first: { apply: firstOperation },
  limit: {
    apply: async (vars, next, { query }) => {
      const resources = await next(vars);
      const { limit, offset = 0 } = query;

      return resources.slice(offset, limit && limit + offset);
    },
  },
  order: {
    apply: orderOperation,
  },
  constraints: {
    apply: async (vars, next, context) => {
      const { config, query } = context;

      if (!query.constraints) return next(vars);

      const { constraints } = query;
      const { expressionDefinitions } = config;
      const isExpression = makeIsExpression(expressionDefinitions);
      const resources = await next(vars);

      // an expression has been passed as the constraint value
      if (isExpression(constraints)) {
        return resources.filter(
          compileExpression(expressionDefinitions, constraints, context),
        );
      }

      // an object of properties has been passed in
      const propExprs = Object.entries(constraints).map(([propKey, propValOrExpr]) =>
        isExpression(propValOrExpr)
          ? { [propKey]: [{ $prop: propKey }, ...propValOrExpr] }
          : { $eq: [{ $prop: propKey }, propValOrExpr] },
      );

      const objectExpression = { $and: propExprs };
      const filterFn = compileExpression(
        expressionDefinitions,
        objectExpression,
        context,
      );

      return resources.filter(filterFn);
    },
  },
};
