import { mapObj } from "@polygraph/utils";
import { ResourceOfType, Schema } from "../types";
import { cardinalize } from "../utils";

let cachedKey;
let cachedVal;

type DefaultResources<S extends Schema> = {
  [P in keyof S["resources"]]: ResourceOfType<S, P>
}

export function defaultResources<S extends Schema>(schema: S): DefaultResources<S> {
  if (cachedKey !== schema) {
    cachedKey = schema;
    cachedVal = mapObj(
      schema.resources,
      <ResType extends keyof S["resources"]>(resDef, resType: ResType): ResourceOfType<S, ResType> => {
        const properties = mapObj(
          resDef.properties,
          (prop) => prop.default ?? undefined,
        );
        const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

        return {
          type: resType,
          properties,
          relationships,
        } as ResourceOfType<S, ResType>;
      },
    );
  }

  return cachedVal;
}
