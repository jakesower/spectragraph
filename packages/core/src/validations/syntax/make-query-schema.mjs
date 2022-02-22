import { mapObj } from "@polygraph/utils";

export function makeQuerySchema(schema) {
  const resourceQuery = (resDef) => {
    const resourceProperties = {
      type: "array",
      items: {
        enum: [...Object.keys(resDef.properties), ...Object.keys(resDef.relationships)],
      },
    };
    const resourceRelationships = {
      type: "object",
      additionalProperties: false,
      properties: mapObj(resDef.relationships, (relDef) => ({
        $ref: `#/$defs/${relDef.relatedType}`,
      })),
    };

    return {
      type: "object",
      additionalProperties: false,
      properties: {
        allNonRefProps: { type: "boolean" },
        allNonReferenceProperties: { type: "boolean" },
        allRefProps: { type: "boolean" },
        allReferenceProperties: { type: "boolean" },
        excludedProps: resourceProperties,
        excludedProperties: resourceProperties,
        properties: resourceProperties,
        props: resourceProperties,
        relationships: resourceRelationships,
        rels: resourceRelationships,
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
    $id: `schemas/${schema.urlName}/query-schema`,
    $schema: "http://json-schema.org/draft-07/schema",
    title: `${schema.title ?? "Polygraph"} Query`,
    description: "Validations for queries.",
    type: "object",
    oneOf: Object.values(topResources),
    $defs: mapObj(schema.resources, resourceQuery),
  };
}
