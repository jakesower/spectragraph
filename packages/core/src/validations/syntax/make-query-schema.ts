import { mapObj } from "@polygraph/utils";
import { Schema } from "../../types";

export function makeQuerySchema<S extends Schema>(schema: S) {
  const resourceQuery = <ResType extends keyof S["resources"]>(
    resDef: S["resources"][ResType],
  ) => ({
      type: "object",
      properties: {
        properties: {
          type: "array",
          items: { enum: Object.keys(resDef.properties) },
        },
        relationships: {
          type: "object",
          additionalProperties: false,
          properties: mapObj(resDef.relationships, (relDef) => ({
            $ref: `#/$defs/${relDef.type}`,
          })),
        },
      },
    });

  const topIfs = Object.keys(schema.resources).map((resType) => ({
    if: {
      properties: {
        type: { const: resType },
      },
    },
    then: {
      $ref: `#/$defs/${resType}`,
    },
  }));

  return {
    $id: `schemas/${schema.urlName}/query-schema`,
    $schema: "http://json-schema.org/draft-07/schema",
    title: `${schema.title ?? "Polygraph"} Query`,
    description: "Validations for queries.",
    type: "object",
    required: ["type"],
    additionalProperties: false,
    properties: {
      type: { enum: Object.keys(schema.resources) },
      id: { type: "string" },
      relationships: { type: "object" },
      properties: { type: "array" },
    },
    allOf: topIfs,
    $defs: mapObj(schema.resources, resourceQuery),
  };
}
