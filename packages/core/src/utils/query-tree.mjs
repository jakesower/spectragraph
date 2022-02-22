import { pick } from "@polygraph/utils";
import { difference } from "@polygraph/utils/arrays";
import { PolygraphError } from "../validations/errors.mjs";
import { typeValidations } from "../validations/type-validations.mjs";
import { normalizeQuery } from "./normalize-query.mjs";

function withRootData(schema, fullDataTree) {
  const internalQueryTree = (query, dataTree, path) => {
    const schemaDef = schema.resources[query.type];

    // TODO: these could be calculated once rather than per-resource
    const relProps = Object.keys(schemaDef.relationships)
      .filter((relKey) => query.properties.includes(relKey));
    const sqKeys = Object.keys(query.subQueries);
    const implicitSubQueries = relProps.reduce((acc, relProp) => ({
      ...acc, [relProp]: { type: schemaDef.relationships[relProp].relatedType },
    }), {});
    const propKeys = difference(query.properties, relProps);

    const getId = () => {
      const idField = schemaDef.idField ?? "id";
      if (!dataTree[idField]) {
        throw new PolygraphError(
          "resources require an id field to be present",
          { fullDataTree, path, idField },
        );
      }

      return dataTree[idField];
    };

    const getProps = () => {
      const properties = {};
      propKeys.forEach((propKey) => {
        const propDef = schemaDef.properties[propKey];
        if (propKey in dataTree) {
          const value = dataTree[propKey];
          if (!typeValidations[propDef.type](value)) {
            throw new PolygraphError(
              "a property did not meet the validation criteria",
              {
                fullDataTree, path: [...path, propKey], value, expectedType: propDef.type,
              },
            );
          }
          properties[propKey] = value;
        }
      });

      return properties;
    };

    const relationships = pick(dataTree, [...sqKeys, ...relProps]);
    const subQueries = {
      ...query.subQueries,
      ...implicitSubQueries,
    };
    const relKeys = Object.keys(relationships);

    const rootResource = {
      type: query.type,
      id: getId(),
      // properties: getProps(),
      properties: pick(dataTree, propKeys),
      relationships,
    };

    const forEachResource = (fn) => {
      fn(rootResource);

      relKeys.forEach((relKey) => {
        const relDef = schemaDef.relationships[relKey];
        const nextPath = [...path, relKey];
        const subQuery = subQueries[relKey];

        if (relDef.cardinality === "one" && dataTree[relKey] != null) {
          internalQueryTree(subQuery, dataTree[relKey], nextPath).forEachResource(fn);
        } else if (relDef.cardinality === "many") {
          dataTree[relKey].forEach((subTree, idx) => {
            const nextPathWithIdx = [...nextPath, idx];
            internalQueryTree(subQuery, subTree, nextPathWithIdx).forEachResource(fn);
          });
        }
      });
    };

    return {
      forEachResource,
      rootResource,
    };
  };

  return internalQueryTree;
}

export function queryTree(schema, query, dataTree) {
  const normalizedQuery = normalizeQuery(schema, query);
  return withRootData(schema, dataTree)(normalizedQuery, dataTree, []);
}
