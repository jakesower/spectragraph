/* eslint-disable max-len, no-use-before-define */

import { forEachObj, groupBy } from "@polygraph/utils";
import { makeResourceQuiver } from "../data-structures/resource-quiver.mjs";
import { ERRORS } from "../strings.mjs";
import { normalizeResource, queryTree } from "../utils/utils.mjs";
import { normalizeQuery } from "../utils/normalize-query.mjs";
import { PolygraphError } from "../validations/errors.mjs";
import { syntaxValidations as syntaxValidationsForSchema } from "../validations/syntax-validations.mjs";
import { validateAndExtractQuiver } from "./validate-and-extract-quiver.mjs";
import { runQuery } from "./operations/run-query.mjs";

/**
 * TODO:
 * - Some queries guarantee no internal inconsistencies, a good place for optimization.
 */
function makeEmptyStore(schema) {
  const resources = {};
  const resTypes = Object.keys(schema.resources);
  resTypes.forEach((resourceName) => {
    resources[resourceName] = {};
  });
  return resources;
}

export async function makeMemoryStore(schema, options = {}) {
  const store = makeEmptyStore(schema);
  const syntaxValidations = syntaxValidationsForSchema(schema);
  const customValidations = options.validations ?? [];
  const resourceValidations = groupBy(customValidations, (v) => v.resourceType);

  const dereference = (ref) => (ref ? store[ref.type][ref.id] : null);

  const applyQuiver = async (quiver) => {
    const data = await validateAndExtractQuiver(schema, store, quiver, resourceValidations);
    const output = {};

    forEachObj(data, (ressById, resType) => {
      const untypedStore = store;
      output[resType] = {};
      forEachObj(ressById, (resValue, resId) => {
        if (resValue === null) {
          delete untypedStore[resType][resId];
        } else {
          untypedStore[resType][resId] = resValue;
        }
        output[resType][resId] = resValue;
      });
    });

    return output;
  };

  // TODO: do not allow this to be valid if a resource is missing from both the updates or the store
  // (imagine a case where no props are required--it might be fine in a tree, but not a res update)
  const replaceResources = async (updated) => {
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      Object.entries(updated).forEach(([type, typedResources]) => {
        Object.entries(typedResources).forEach(([id, updatedRes]) => {
          if (updatedRes === null) {
            retractResource(normalizeResource(schema, type, store[type][id]));
          } else {
            assertResource(
              normalizeResource(schema, type, updatedRes),
              store[type][id],
            );
          }
        });
      });
    });

    return applyQuiver(quiver);
  };

  // const getOne = async (query) => {
  //   const getFromStore = ({ type, id }) => (id ? store[type][id] : store[type]);
  //   const out = runQuery(query, getFromStore, { schema, query, dereference });

  //   return Promise.resolve(out);
  // };

  // const getMany = (query) => {
  //   const getFromStore = ({ type, id }) => (id ? store[type][id] : store[type]);
  //   const out = runQuery(query, getFromStore, { schema, query, dereference });

  //   return Promise.resolve(out);
  // };

  const get = (query) => {
    if (!syntaxValidations.querySyntax(query)) {
      throw new PolygraphError(ERRORS.INVALID_GET_QUERY_SYNTAX, {
        query,
        schemaErrors: syntaxValidations.querySyntax.errors,
      });
    }

    const normalQuery = normalizeQuery(schema, query);
    const getFromStore = ({ type, id }) => (id ? store[type][id] ?? null : Object.values(store[type]));
    const out = runQuery(normalQuery, getFromStore, { schema, query: normalQuery, dereference });

    return Promise.resolve(out);
  };

  const replaceMany = async (query, trees) => {
    const seenRootResourceIds = new Set();
    const existingResources = store[query.type];
    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      trees.forEach((tree) => {
        const { forEachResource, rootResource } = queryTree(schema, query, tree);

        seenRootResourceIds.add(rootResource.id);
        assertResource(rootResource, store[rootResource.type][rootResource.id]);
        forEachResource((res) => {
          assertResource(res, store[res.type][res.id]);
        });
      });

      Object.entries(existingResources).forEach(([resId, existingRes]) => {
        if (!seenRootResourceIds.has(resId)) {
          retractResource(normalizeResource(schema, query.type, existingRes));
        }
      });
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async (query, tree) => {
    const { queryTreeSyntax } = syntaxValidations;
    if (!queryTreeSyntax({ query, tree })) {
      throw new PolygraphError(
        ERRORS.INVALID_SET_QUERY_SYNTAX,
        { query, tree, schemaErrors: queryTreeSyntax.errors },
      );
    }

    const quiver = makeResourceQuiver(schema, ({ assertResource, retractResource }) => {
      if (tree === null) {
        retractResource({ type: query.type, id: query.id });
      } else {
        queryTree(schema, query, tree).forEachResource((res) => assertResource(res, store[res.type][res.id]));
      }
    });

    return applyQuiver(quiver);
  };

  if (options.initialData) {
    await replaceResources(options.initialData);
  }

  return {
    get,
    replaceOne,
    replaceMany,
    replaceResources,
  };
}
