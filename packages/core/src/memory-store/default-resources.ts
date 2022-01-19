import { mapObj } from "@polygraph/utils";
import { NormalResource, Schema } from "../types";
import { cardinalize } from "../utils";

let cachedKey;
let cachedVal;

type DefaultResources<S extends Schema> = {
  [P in keyof S["resources"]]: NormalResource<S, P>
}

export function defaultResources<S extends Schema>(schema: S): DefaultResources<S> {
  if (cachedKey !== schema) {
    cachedKey = schema;
    cachedVal = mapObj(
      schema.resources,
      <RT extends keyof S["resources"]>(resDef, resType: RT): NormalResource<S, RT> => {
        const properties = mapObj(
          resDef.properties,
          (prop) => prop.default ?? undefined,
        );
        const relationships = mapObj(resDef.relationships, (relDef) => cardinalize([], relDef));

        return {
          type: resType,
          properties,
          relationships,
        } as NormalResource<S, RT>;
      },
    );
  }

  return cachedVal;
}
