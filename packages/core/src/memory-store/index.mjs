/* eslint-disable max-len, no-use-before-define */

import {
  forEachObj, groupBy, mapObj, partition, pick,
} from "@polygraph/utils";
import { makeResourceQuiver } from "../data-structures/resource-quiver.mjs";
import {
  asArray, cardinalize, denormalizeResource, normalizeResource, queryTree,
} from "../utils/index.mjs";
import { PolygraphGetQuerySyntaxError, PolygraphReplaceSyntaxError } from "../validations/errors.mjs";
import { syntaxValidations as syntaxValidationsForSchema } from "../validations/syntax-validations.mjs";
import { validateAndExtractQuiver } from "./validate-and-extract-quiver.mjs";

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
        output[resType][resId] = denormalizeResource(resValue);
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
            retractResource(store[type][id]);
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

  const buildTree = (query, resource) => {
    const schemaResDef = schema.resources[query.type];
    const schemaPropKeys = Object.keys(schemaResDef.properties);
    const schemaRelKeys = Object.keys(schemaResDef.relationships);
    const propKeys = query.properties ?? schemaPropKeys;
    const [refRelKeys, nestedRelKeys] = query.relationships
      ? partition(
        Object.keys(query.relationships),
        (relKey) => query.relationships[relKey].referencesOnly,
      )
      : [schemaRelKeys, []];

    const relsToRefs = pick(resource.relationships, refRelKeys);
    const relsToExpand = pick(resource.relationships, nestedRelKeys);

    const expandedRels = mapObj(
      relsToExpand,
      (relRef, relKey) => {
        const relDef = schemaResDef.relationships[relKey];
        const subResourceRefs = asArray(resource.relationships[relKey]);
        const subRel = query.relationships[relKey];
        const subQuery = { ...subRel, type: relDef.relatedType };
        const subTrees = subResourceRefs.map((subResRef) => {
          const subRes = store[subResRef.type][subResRef.id];
          return buildTree(subQuery, subRes);
        });
        return cardinalize(subTrees, relDef);
      });

    return {
      id: resource.id,
      ...pick(resource.properties, propKeys),
      ...relsToRefs,
      ...expandedRels,
    };
  };

  const getOne = async (query) => {
    if (!syntaxValidations.querySyntax(query)) {
      throw new PolygraphGetQuerySyntaxError(query, syntaxValidations.querySyntax.errors);
    }

    const out = store[query.type][query.id]
      ? buildTree(query, store[query.type][query.id])
      : null;

    return Promise.resolve(out);
  };

  const getMany = (query) => {
    const allResources = Object.values(store[query.type]);
    const out = allResources.map((res) => buildTree(query, res));

    return Promise.resolve(out);
  };

  const get = (query) => (
    ("id" in query)
      ? getOne(query)
      : getMany(query)
  );

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
          retractResource(existingRes);
        }
      });
    });

    return applyQuiver(quiver);
  };

  const replaceOne = async (query, tree) => {
    const { queryTreeSyntax } = syntaxValidations;
    if (!queryTreeSyntax({ query, tree })) {
      throw new PolygraphReplaceSyntaxError(query, tree, queryTreeSyntax.errors);
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
