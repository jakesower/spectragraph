import { compileExpression, isValidExpression } from "@polygraph/expressions";
import { sortBy } from "@polygraph/utils";
import { ERRORS, PolygraphError } from "./errors.mjs";

const compareFns = {
  integer: (left, right) => left - right,
  number: (left, right) => left - right,
  string: (left, right) => left.localeCompare(right),
};

export function orderFunction(order, { config, query, schema }) {
  const { type: resType } = query;
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

function orderOperation(order, resources, context) {
  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  // SELECT cols mean sort fields might be omitted
  return sortBy(resources, orderFunction(order, context));
}

function firstOperation(_, resources) {
  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
  }

  return resources[0];
}

export const coreOperations = {
  first: { postQuery: { apply: firstOperation } },
  limit: {
    postQuery: {
      apply: (limit, resources, { query }) => {
        const { offset = 0 } = query;
        return resources.slice(offset, limit && limit + offset);
      },
    },
  },
  order: {
    postQuery: { apply: orderOperation },
  },
  constraints: {
    postQuery: {
      apply: (constraints, resources, context) => {
        const { config } = context;

        const { expressionDefinitions } = config;

        // an expression has been passed as the constraint value
        if (isValidExpression(constraints, expressionDefinitions)) {
          return resources.filter(
            compileExpression(constraints, expressionDefinitions, context),
          );
        }

        // an object of properties has been passed in
        const propExprs = Object.entries(constraints).map(([propKey, propValOrExpr]) =>
          isValidExpression(propValOrExpr, expressionDefinitions)
            ? { [propKey]: [{ $prop: propKey }, ...propValOrExpr] }
            : { $eq: [{ $prop: propKey }, propValOrExpr] },
        );

        const objectExpression = { $and: propExprs };
        const filterFn = compileExpression(
          objectExpression,
          expressionDefinitions,
          context,
        );

        return resources.filter(filterFn);
      },
    },
  },
};
