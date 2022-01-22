import { mapObj } from "@polygraph/utils";
import { cardinalize } from "../utils";

let cachedKey;
let cachedVal;

export function defaultResources(schema) {
  if (cachedKey !== schema) {
    cachedKey = schema;
    cachedVal = mapObj(
      schema.resources,
      (resDef, resType) => {
        const properties = mapObj(
          resDef.properties,
          (prop) => prop.default ?? undefined,
        );
        const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

        return {
          type: resType,
          properties,
          relationships,
        };
      },
    );
  }

  return cachedVal;
}
