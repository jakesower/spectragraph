import { mapObj, pick } from "@blossom/utils";
import { multiApply } from "@blossom/utils/functions";
import { BlossomError } from "../errors.mjs";

// TODO: Is this used?

function withRootData(schema, fullDataTree) {
  const internalQueryTree = (query, dataTree, path) => {
    const schemaDef = schema.resources[query.type];

    const getId = () => {
      const idField = schemaDef.idField ?? "id";
      if (!dataTree[idField]) {
        throw new BlossomError(
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
      relationships: mapObj(
        pick(dataTree, Object.keys(query.relationships)),
        (subTree, relName) => multiApply(
          subTree,
          ({ id }) => ({ id, type: schemaDef.properties[relName].relatedType }),
        ),
      ),
    };

    const forEachResource = (fn) => {
      fn(rootResource);

      Object.keys(query.relationships).forEach((relKey) => {
        const relDef = schemaDef.properties[relKey];
        const nextPath = [...path, relKey];
        const subquery = query.relationships[relKey];

        if (relDef.cardinality === "one" && dataTree[relKey] != null) {
          internalQueryTree(subquery, dataTree[relKey], nextPath).forEachResource(fn);
        } else if (relDef.cardinality === "many") {
          dataTree[relKey].forEach((subTree, idx) => {
            const nextPathWithIdx = [...nextPath, idx];
            internalQueryTree(subquery, subTree, nextPathWithIdx).forEachResource(fn);
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

export function queryTree(schema, normalQuery, dataTree) {
  return withRootData(schema, dataTree)(normalQuery, dataTree, []);
}
