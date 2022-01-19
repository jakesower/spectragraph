import { mapObj } from "@polygraph/utils";
import { Schema } from "../../types";

// 3 kinds of potential trees: (going with #3 for now)
// - strict adherence to query props/rels
// - adherence to properties inside the resource type
// - free-for-all with properties, so long as relevant ones obey rules

export function makeQueryTreeSchema<S extends Schema>(schema: S) {
  const resourceNodes = <ResType extends keyof S["resources"]>(
    resDef: S["resources"][ResType],
  ) => ({
      type: "object",
      required: ["id"], // this may need to change if PG becomes responsible for generating IDs (likely)
      properties: {
        id: { type: "string", minLength: 1 },
        ...mapObj(resDef.properties, (propDef) => ({
          type: propDef.type,
        })),
        ...mapObj(resDef.relationships, (relDef) => (relDef.cardinality === "one"
          ? {
            oneOf: [
              { $ref: `#/$defs/${relDef.relatedType}` },
              { type: "null" },
            ],
          }
          : { type: "array", items: { $ref: `#/$defs/${relDef.relatedType}` } }),
        ),
      },
    });

  // these link the root query type to a root property type in the tree
  const resourceIfs = Object.keys(schema.resources).map((resType) => ({
    if: {
      properties: {
        query: {
          type: "object",
          properties: { type: { const: resType } },
        },
      },
    },
    then: {
      if: { // determine if it's a singular or plural query
        type: "object",
        properties: {
          query: {
            type: "object",
            required: ["id"],
          },
        },
      },
      then: {
        properties: {
          tree: {
            allOf: [
              { $ref: `#/$defs/${resType}` },
              {
                type: "object",
                properties: { id: { const: { $data: "2/query/id" } } },
              },
            ],
          },
        },
      },
      else: {
        properties: {
          tree: {
            type: "array",
            items: { $ref: `#/$defs/${resType}` },
          },
        },
      },
    },
  }));

  const out = {
    $id: `schemas/${schema.urlName}/query-tree-schema`,
    $schema: "http://json-schema.org/draft-07/schema",
    title: `${schema.title ?? "Polygraph"} Query Tree`,
    description: "Validations for queries and associated trees.",
    type: "object",
    required: ["query", "tree"],
    properties: {
      query: { $ref: "query-schema" },
    },
    allOf: resourceIfs,
    $defs: mapObj(schema.resources, resourceNodes),
  };

  // console.log(JSON.stringify(out, null, 2));
  return out;
}
