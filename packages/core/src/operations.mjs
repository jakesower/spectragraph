import { compileExpression, isValidExpression } from "@blossom/expressions";
import { flatMapQuery } from "@blossom/core/query";
import { multiApply } from "@blossom/utils/functions";
import { pipeThru } from "@blossom/utils/pipes";
import { sortBy } from "@blossom/utils";
import { ERRORS, BlossomError } from "./errors.mjs";

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
    throw new BlossomError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  // SELECT cols mean sort fields might be omitted
  return sortBy(resources, orderFunction(order, context));
}

function firstOperation(_, resources) {
  if (!Array.isArray(resources)) {
    throw new BlossomError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
  }

  return resources[0];
}

export const coreOperations = {
  first: { postQuery: { apply: firstOperation } },
  limit: {
    handles: ["limit", "offset"],
    if: (unhandledArgs) => unhandledArgs.limit || unhandledArgs.offset,
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

// buildStoreQuery has the job of calling for children, then composing the
// results into a query for the store

// const runBuildStoreQuery = (query, buildStoreQuery, argHandlers, context) => {
//   const preQueryArgHandlers = Object.entries(argHandlers)
//     .filter(([, argHandler]) => argHandler.preQuery)
//     .map(([argName, argHandler]) => argHandler(query[argName], context));

//   const buildTraverse = (subQuery) => {
//     const childLevels = mapObj(subQuery.relationships, (relQuery) => {
//       const builtQuery = pipeThru(relQuery, preQueryArgHandlers);
//     });
//     const level = buildStoreQuery(subQuery);
//   };

//   return buildStoreQuery();
// };

// const runQuery = (query, stages, argHandlers) => {
//   const { buildStoreQuery, runStoreQuery, buildResults } = stages;
//   // const traverse = (subQuery) =>
// };

const applyOverPaths = (resources, path, fn) => {
  if (path.length === 0) return fn(resources);

  const [head, ...tail] = path;
  return multiApply(resources, (resource) => ({
    ...resource,
    [head]: applyOverPaths(resource[head], tail, fn),
  }));
};

const gatherPreOperations = (query, context) => {
  const { operations } = context;

  return flatMapQuery(query, (subQuery, queryPath) =>
    Object.entries(subQuery)
      .flatMap(([operationKey, operationArg]) => {
        const operation = operations[operationKey]?.preQuery?.apply;

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
};

const gatherPostOperationFunctions = (query, context) => {
  const { operations } = context;

  return flatMapQuery(query, (subQuery, queryPath) =>
    Object.entries(subQuery)
      .map(([operationKey, operationArg]) => {
        const operation = operations[operationKey]?.postQuery?.apply;

        if (!operation) return null;

        const argContext = { ...context, query: subQuery, queryPath };
        return (resources) =>
          applyOverPaths(resources, queryPath, (resource) =>
            operation(operationArg, resource, argContext),
          );
      })
      .filter(Boolean),
  );
};

export async function runQuery(query, context, run) {
  const queryModifierPromises = gatherPreOperations(query, context);
  const queryModifiers = await Promise.all(queryModifierPromises);

  const resources = await run(queryModifiers);

  const postOps = gatherPostOperationFunctions(query, context);

  return pipeThru(resources, postOps);
}

// const runGqlStoreQuery = async (query, context) => {
//   const { resolversByType, transport } = context;
//   const built = buildStoreQuery(query, operations);
//   const gqlQuery = `
//     ${resolversByType[subQuery.type[cardinality.cardinality]]} {
//       ${subQuery.properties.join("\n ")}
//       ${Object.values(children).join("\n ")}
//     }
//   `;

//   const result = await transport.get({ gqlQuery });

//   return result.data;
// };

// // const buildSqlStoreQuery = (levelQuery, getBuiltChildren) => {
// //   return [...levelQuery, Object.values(getBuiltChildren())];

// // }
