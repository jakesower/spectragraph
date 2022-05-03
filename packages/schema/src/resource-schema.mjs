import Ajv from "ajv";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import { PolygraphError } from "@polygraph/core";

const schemaSchema = yaml.load(
  readFileSync("./src/schemas/resource-schema.schema.yml").toString("utf-8"),
);

const schemaValidator = new Ajv().compile(schemaSchema);

function ensureValid(rawSchema) {
  if (!schemaValidator(rawSchema)) {
    throw new PolygraphError("invalid schema", { errors: schemaValidator.errors });
  }

  Object.entries(rawSchema.resources).forEach(([resName, resDef]) => {
    Object.entries(resDef.properties)
      .filter(([, { type }]) => type === "relationship")
      .forEach(([relName, relDef]) => {
        const { inverse, relatedType } = relDef;
        if (inverse) {
          const invRel = rawSchema.resources?.[relatedType]?.properties?.[inverse];
          const baseError = {
            resourceType: resName,
            relationship: { [relName]: relDef },
          };

          if (!rawSchema.resources[relatedType]) {
            throw new PolygraphError(
              "the related resource type doesn't exist within the schema",
              baseError,
            );
          }

          if (!rawSchema.resources[relatedType]?.properties?.[inverse]) {
            throw new PolygraphError(
              "the related resource doesn't have the inverse as a relationship",
              { ...baseError, inverse },
            );
          }

          if (invRel.relatedType !== resName) {
            throw new PolygraphError("the inverse resources don't point to each other", {
              ...baseError,
              inverseRelationship: invRel,
            });
          }

          if (invRel.inverse !== relName) {
            throw new PolygraphError(
              "the relationship inverses don't point to each other",
              { ...baseError, inverseRelationship: invRel },
            );
          }
        }
      });
  });
}

export function ResourceSchema(schema, validations, options) {
  ensureValid(schema);

  return {
    ...schema,
    validations,
    options,
  };
}
