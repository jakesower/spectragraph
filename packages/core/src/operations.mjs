import { compileExpression, isValidExpression } from "@blossom/expressions";
import { flatMapQuery } from "@blossom/core/query";
import {
  pipeThruAsyncWithContext,
  pipeThruMiddlewareAsync,
  // pipeThruMiddlewareAsyncDebug as pipeThruMiddlewareAsync,
} from "@blossom/utils/pipes";
import { mapObj, pick, promiseAllObj } from "@blossom/utils/objects";
import { sortBy } from "@blossom/utils";
import { ERRORS, BlossomError } from "./errors.mjs";

const compareFns = {
  integer: (left, right) => left - right,
  number: (left, right) => left - right,
  string: (left, right) => left.localeCompare(right),
};

function compileOperation(operationDef, operationName) {
  return {
    if: (query) => operationName in query,
    ...operationDef,
  };
}

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

export const coreOperations = {
  first: {
    postQuery: {
      apply: async (resources, next) => {
        const result = await next(resources);

        if (!Array.isArray(result)) {
          throw new BlossomError(ERRORS.FIRST_NOT_ALLOWED_ON_SINGULAR, {});
        }

        return result[0] ?? null;
      },
    },
  },
  id: {
    postQuery: {
      apply: async (resources, next, { query }) => {
        const resource = resources.find((res) => res[query.idField] === query.id);
        if (!resource) return null;

        const result = await next([resource]);
        return result[0] ?? null;
      },
    },
  },
  properties: {
    postQuery: {
      apply: async (queryTrees, next, { query }) => {
        const { properties, relationships } = query;

        const withProcessedChildren = await next(queryTrees);

        return withProcessedChildren.map((res) =>
          pick(res, [query.idField, ...properties, ...Object.keys(relationships)]),
        );
      },
    },
  },
  limit: {
    if: (query) => query.limit || query.offset,
    postQuery: {
      apply: async (resources, next, { query }) => {
        const { limit, offset = 0 } = query;
        const result = await next(resources);

        return result.slice(offset, limit && limit + offset);
      },
    },
  },
  order: {
    postQuery: {
      apply: async (resources, next, context) => {
        const { order } = context.query;
        const result = await next(resources);

        if (!Array.isArray(result)) {
          throw new BlossomError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, result);
        }

        // SELECT cols mean sort fields might be omitted
        return sortBy(result, orderFunction(order, context));
      },
    },
  },
  constraints: {
    postQuery: {
      apply: (resources, context) => {
        const { config, query } = context;
        const { constraints } = query;

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
  ids: {
    postQuery: {
      apply: async (resources, next, { query }) => {
        const nextRess = await Promise.all(
          resources.filter((res) => query.ids.includes(res[query.idField])),
        );
        return next(nextRess);
      },
    },
  },
  relationships: {
    postQuery: {
      // resolver style -- no attempt to optimize
      apply: async (resources, next, context) => {
        const { query } = context;

        const withExpandedRelationships = await Promise.all(
          resources.map(async (resource) => {
            const relResults = await promiseAllObj(
              mapObj(query.relationships, async (relQuery, relName) => {
                if (!resource[relName]) return null;

                const relVal = resource[relName];
                const idClause = Array.isArray(relVal) ? { ids: relVal } : { id: relVal };
                const ran = await runQuery(
                  { ...context, query: { ...relQuery, ...idClause } },
                  context.run,
                );

                return ran;
              }),
            );

            return { ...resource, ...relResults };
          }),
        );

        return next(withExpandedRelationships);
      },
    },
  },
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

const gatherPostOperations = (query, context) => {
  // TODO: incorporate multiple ops that can handle the same properties
  const { operations } = context;

  // need to track handled stuff?
  return Object.values(operations).flatMap((opDef) => {
    if (!opDef.postQuery || !opDef.if(query)) return [];
    return [opDef.postQuery.apply];
  });
};

export async function runQuery(storeContext, run) {
  const context = {
    ...storeContext,
    config: { orderingFunctions: {} },
    operations: mapObj(
      { ...coreOperations, ...(storeContext.operations ?? {}) },
      compileOperation,
    ),
    run,
  };

  const { query } = context;

  const preOps = gatherPreOperations(query, context);
  const preRunPipe = [...preOps, run];
  const resources = await pipeThruAsyncWithContext(query, context, preRunPipe);

  const postOps = gatherPostOperations(query, context);
  const result = await pipeThruMiddlewareAsync(resources, context, postOps);

  return result;
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
