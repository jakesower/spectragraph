import {
  DataTree, Query, NormalResourceUpdate, Schema,
} from "../types";
import { typeValidations } from "../validations/type-validations";
import { PolygraphError } from "../validations/errors";

export type QueryTree<S extends Schema, RT extends keyof S["resources"]> = Readonly<{
  forEachResource: (fn: (res: NormalResourceUpdate<S, RT>) => void) => void,
  rootResource: NormalResourceUpdate<S, RT>;
}>;

function withRootData<S extends Schema>(schema: S, fullDataTree: DataTree) {
  const internalQueryTree = <
    RT extends keyof S["resources"], Q extends Query<S, RT>
  >(query: Q, dataTree: DataTree, path: (string | number)[]): QueryTree<S, RT> => {
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

    const getProps = () => {
      const propKeys = query.properties ?? Object.keys(schemaDef.properties);
      const properties: Pick<DataTree, string> = {};
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

    const getRels = () => {
      const relKeys = Object.keys(query.relationships ?? schemaDef.relationships);
      const relationships = {};

      relKeys.forEach((relKey) => {
        const relDef = schemaDef.relationships[relKey];
        const relResDef = schema.resources[relDef.relatedType];

        const getRelRef = (relRes, relPath) => {
          const idField = relResDef.idField ?? "id";
          const foundId = relRes[idField];
          if (!foundId) {
            throw new PolygraphError(
              "resources require an id field to be present",
              {
                tree: fullDataTree,
                path: relPath,
                idField,
                value: relRes,
              },
            );
          }

          return { type: relDef.relatedType, id: foundId };
        };

        if (relKey in dataTree) {
          const relResOrRess = dataTree[relKey];
          const nextPath = [...path, relKey];

          if (relDef.cardinality === "one") {
            if (Array.isArray(relResOrRess)) {
              throw new PolygraphError(
                "a to-one relationship has multiple values when it should have a single value or be null",
                { tree: fullDataTree, path: nextPath, value: relResOrRess },
              );
            }

            relationships[relKey] = relResOrRess ? getRelRef(relResOrRess, nextPath) : null;
          }

          if (relDef.cardinality === "many") {
            if (!Array.isArray(relResOrRess)) {
              if (relResOrRess == null) {
                throw new PolygraphError(
                  "a to-many relationship has a null value instead of an empty array",
                  { tree: fullDataTree, path: nextPath, value: relResOrRess },
                );
              }

              throw new PolygraphError(
                "a to-many relationship has a single value instead of an array of values",
                { tree: fullDataTree, path: nextPath, value: relResOrRess },
              );
            }

            relationships[relKey] = relResOrRess.map(
              (relRes, idx) => getRelRef(relRes, [...nextPath, idx]),
            );
          }
        }
      });

      return relationships;
    };

    // MAIN FUNCTION BODY

    const rootResource = {
      type: query.type,
      id: getId(),
      properties: getProps(),
      relationships: getRels(),
    } as NormalResourceUpdate<S, RT>;

    const forEachResource = (fn) => {
      fn(rootResource);

      Object.keys(query.relationships ?? {}).forEach((relKey) => {
        const relDef = schemaDef.relationships[relKey];
        const nextPath = [...path, relKey];
        const subQuery = {
          ...query.relationships[relKey],
          type: schemaDef.relationships[relKey].relatedType,
        };

        if (relDef.cardinality === "one" && dataTree[relKey] !== null) {
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

export function queryTree<
  S extends Schema,
  RT extends keyof S["resources"],
>(schema: S, query: Query<S, RT>, dataTree: DataTree): QueryTree<S, RT> {
  return withRootData(schema, dataTree)(query, dataTree, []);
}
