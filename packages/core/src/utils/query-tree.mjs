import { pick } from "@polygraph/utils";
import { PolygraphError } from "../validations/errors.mjs";
import { normalizeQuery } from "./normalize-query.mjs";

function withRootData(schema, fullDataTree) {
  const internalQueryTree = (query, dataTree, path) => {
    const schemaDef = schema.resources[query.type];

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

    const rootResource = {
      type: query.type,
      id: getId(),
      properties: pick(dataTree, query.properties),
      relationships: pick(dataTree, Object.keys(query.relationships)),
    };

    const forEachResource = (fn) => {
      fn(rootResource);

      Object.keys(query.relationships).forEach((relKey) => {
        const relDef = schemaDef.relationships[relKey];
        const nextPath = [...path, relKey];
        const subQuery = query.relationships[relKey];

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
