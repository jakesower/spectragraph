/* eslint-disable import/no-cycle */

import { compileExpression, isValidExpression } from "@blossom-js/expressions";
import { reverse } from "@blossom-js/utils/arrays";
import { multiApply, multiApplyAsync } from "@blossom-js/utils/functions";
import { mapObj, pick, promiseAllObj } from "@blossom-js/utils/objects";
import { sortBy } from "@blossom-js/utils";
import { ERRORS, BlossomError } from "./errors.mjs";
import { compileQuery } from "./query.mjs";

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

const defaultOperationConfig = {
  apply: () => {
    throw new Error("operations must have an apply method defined");
  },
  incompatibleWith: [],
  redundantWith: [],
  sequenceAfter: [],
};

export const coreOperations = {
  first: {
    apply: (results) => {
      if (!Array.isArray(results)) {
        throw new BlossomError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
      }

      return results[0];
    },
    handlesAny: ["first"],
    id: "first",
    incompatibleWith: ["id"],
    redundantWith: ["limit"],
    sequenceAfter: ["id", "ids", "limitOffset", "order", "where"],
  },
  scopeToId: {
    apply: (results, { query }) =>
      [results.find((res) => res[query.idField] === query.args.id)] ?? null,
    visitsAny: ["id"],
    id: "scopeToId",
    incompatibleWith: ["first", "ids", "where", "order", "limit", "offset"],
    sequenceAfter: [],
  },
  singularizeId: {
    apply: (results) => results[0] ?? null,
    handlesAny: ["id"],
    id: "singularizeId",
  },
  ids: {
    apply: (results, { query }) =>
      results.filter((res) => query.args.ids.includes(res[query.idField])),
    handlesAny: ["ids"],
    id: "ids",
    incompatibleWith: ["id"],
    sequenceAfter: [],
  },
  properties: {
    apply: (results, { query }) => {
      const { properties, relationships } = query.args;
      return multiApply(results, (res) =>
        pick(res, [query.idField, ...properties, ...Object.keys(relationships)]),
      );
    },
    handlesAny: ["properties"],
    id: "properties",
    sequenceAfter: ["id", "ids", "first"],
  },
  limitOffset: {
    apply: async (results, { query }) => {
      const { limit, offset = 0 } = query;
      return results.slice(offset, limit && limit + offset);
    },
    handlesAny: ["limit", "offset"],
    id: "limitOffset",
    sequenceAfter: ["id", "ids", "where", "order"],
  },
  order: {
    apply: async (results, context) => {
      if (!Array.isArray(results)) {
        throw new BlossomError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, results);
      }

      // SELECT cols mean sort fields might be omitted
      return sortBy(results, orderFunction(context));
    },
    handlesAny: ["order"],
    id: "order",
    sequenceAfter: ["id", "ids", "where"],
  },
  where: {
    apply: (results, context) => {
      const { config, query } = context;
      const { where } = query;

      const { expressionDefinitions } = config;

      // an expression has been passed as the constraint value
      if (isValidExpression(where, expressionDefinitions)) {
        return results.filter(compileExpression(where, expressionDefinitions, context));
      }

      // an object of properties has been passed in
      const propExprs = Object.entries(where).map(([propKey, propValOrExpr]) =>
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

      return results.filter(filterFn);
    },
    handlesAny: ["where"],
    id: "where",
    sequenceAfter: ["id", "ids"],
  },
  relationships: {
    apply: async (results, context) => {
      const { query } = context;

      return multiApplyAsync(results, async (resource) => {
        const relResults = await promiseAllObj(
          mapObj(query.args.relationships, async (relQuery, relName) => {
            if (!resource[relName]) return null;

            const relVal = resource[relName];
            const idClause = Array.isArray(relVal) ? { ids: relVal } : { id: relVal };
            const subquery = { ...relQuery, args: { ...relQuery.args, ...idClause } };
            const subqueryRunner = compileQuery(subquery, context);
            const ran = subqueryRunner();

            return ran;
          }),
        );

        return { ...resource, ...relResults };
      });
    },
    handlesAny: ["relationships"],
    id: "relationships",
    sequenceAfter: ["id", "ids", "first"],
  },
};

export const coreQueryPipe = [];
export const coreResultsPipe = [
  coreOperations.scopeToId,
  coreOperations.ids,
  coreOperations.where,
  coreOperations.order,
  coreOperations.offset,
  coreOperations.limit,
  coreOperations.first,
  coreOperations.singularizeId,
  coreOperations.relationships,
  coreOperations.properties,
];

export function operationsPipe(operations) {
  return (init, context) => {
    const { debug = false } = context;

    if (debug) {
      console.log("-----Beginning Operations Pipe-----");
      console.log("initial value", init);
    }

    return reverse(operations).reduce(
      (pipe, operation, idx) => async (val) => {
        const num = operations.length - idx;
        const nextVal = await operation.apply(val, context);
        if (debug) {
          console.log(
            `-----After Operation #${num} (${operation.id ?? "anonymous"})-----`,
          );
          console.log(nextVal);
        }

        return pipe(nextVal);
      },
      (x) => x,
    )(init);
  };
}

export const buildOperationPipe = (query, operations) => {
  const workingPipe = [];
  const workingArgs = { ...query.args };

  operations.forEach((operationDef) => {
    const operation = { ...defaultOperationConfig, ...operationDef };
    const shouldHandle =
      operation.handlesAny?.some((arg) => arg in workingArgs) ||
      operation.handlesAll?.every((arg) => arg in workingArgs) ||
      operation.visitsAny?.some((arg) => arg in workingArgs) ||
      operation.visitsAll?.every((arg) => arg in workingArgs);

    if (shouldHandle) {
      const handledKeys = [
        ...(operation.handlesAny ?? []),
        ...(operation.handlesAll ?? []),
      ];

      workingPipe.push(operationDef);
      handledKeys.forEach((key) => {
        delete workingArgs[key];
      });
    }
  });

  return {
    apply: operationsPipe(workingPipe),
    query: { ...query, args: workingArgs },
  };
};
