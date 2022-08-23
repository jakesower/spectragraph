import { mapObj, partitionObj } from "@blossom/utils/objects";
import { coreExpressions } from "../expressions.mjs";

const constraintDefs = {
  boolean: { type: "boolean" },
  number: { type: "number" },
  string: { type: "string" },
};

const sharedConstraints = mapObj(coreExpressions, () => ({}));

const mutualExclusions = [
  [["limit"], ["first"]],
  [["offset"], ["first"]],
];

export function makeQuerySchema(schema, allowRelProps) {
  const resourceQuery = (resDef) => {
    const [relProps, nonRelProps] = partitionObj(
      resDef.properties,
      ({ type }) => type === "relationship",
    );

    const resourceProperties = {
      type: "array",
      items: {
        enum: [
          ...Object.keys(nonRelProps),
          ...(allowRelProps ? Object.keys(relProps) : []),
        ],
      },
    };

    const resourceRelationships = {
      type: "object",
      additionalProperties: false,
      properties: mapObj(relProps, (relDef) => ({
        $ref: `#/$defs/${relDef.relatedType}`,
      })),
    };

    const resourceConstraints = {
      type: "object",
      additionalProperties: false,
      properties: {
        // ...mapObj(resDef.properties, (prop) => ({ $ref: `#/$defs/constraints/${prop.type}` })),
        ...mapObj(nonRelProps, () => ({})),
        ...sharedConstraints,
      },
    };

    return {
      type: "object",
      additionalProperties: false,
      allOf: mutualExclusions.map(([lefts, rights]) => ({
        if: { required: lefts },
        then: { not: { required: rights } },
      })),
      properties: {
        allProps: { type: "boolean" },
        allProperties: { type: "boolean" },
        excludedProps: resourceProperties,
        excludedProperties: resourceProperties,
        idField: { oneOf: [{ type: "string" }, { type: "number" }] },
        properties: resourceProperties,
        props: resourceProperties,
        relationships: resourceRelationships,
        rels: resourceRelationships,
        // operations
        constraints: resourceConstraints,
        first: { type: "boolean" },
        order: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["direction"],
            anyOf: [{ required: ["function"] }, { required: ["property"] }],
            properties: {
              direction: { type: "string", enum: ["asc", "desc"] },
              function: { type: "string" }, // TODO: verify it's a valid string from init
              property: { type: "string" },
            },
          },
        },
        limit: {
          type: "integer",
          minimum: 1,
        },
        offset: {
          type: "integer",
          minimum: 0,
        },
      },
    };
  };

  const resourceQueries = mapObj(schema.resources, resourceQuery);
  const topResources = mapObj(resourceQueries, (resQuery, resKey) => ({
    ...resQuery,
    required: ["type"],
    properties: {
      ...resQuery.properties,
      type: { const: resKey },
      id: { type: "string" },
    },
  }));

  return {
    $id: `schemas/${schema.urlName}/query-schema${
      allowRelProps ? "-with-rel-props" : ""
    }`,
    $schema: "http://json-schema.org/draft-07/schema",
    title: `${schema.title ?? "blossom"} Query`,
    description: "Validations for queries.",
    type: "object",
    oneOf: Object.values(topResources),
    $defs: {
      ...mapObj(schema.resources, resourceQuery),
      constraints: constraintDefs,
    },
  };
}
