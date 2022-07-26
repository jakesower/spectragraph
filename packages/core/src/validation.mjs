import Ajv from "ajv";
import { difference } from "@polygraph/utils/arrays";
import { makeQuerySchema } from "./schema/make-query-schema.mjs";
import { coreExpressions } from "./expressions.mjs";
import { ERRORS, PolygraphError } from "./errors.mjs";

export const typeValidations = {
  boolean: (val) => val === true || val === false,
  number: Number.isFinite,
  string: (val) => typeof val === "string" || val instanceof String,
};

export function ensureValidGetQuerySyntax(schema, query) {
  const getQuerySchema = makeQuerySchema(schema, true);

  const ajv = new Ajv({
    $data: true,
    schemas: [getQuerySchema],
  });
  ajv.addVocabulary(Object.keys(coreExpressions));

  const getQuerySyntax = ajv.getSchema(
    `schemas/${schema.urlName}/query-schema-with-rel-props`,
  );

  if (!getQuerySyntax(query)) {
    throw new PolygraphError(ERRORS.INVALID_GET_QUERY_SYNTAX, {
      query,
      schemaErrors: JSON.stringify(getQuerySyntax.errors, null, 2),
    });
  }
}

export function ensureValidSetQuerySyntax(schema, query) {
  const setQuerySchema = makeQuerySchema(schema, false);

  const ajv = new Ajv({
    $data: true,
    schemas: [setQuerySchema],
  });
  ajv.addVocabulary(Object.keys(coreExpressions));

  const setQuerySyntax = ajv.getSchema(`schemas/${schema.urlName}/query-schema`);

  if (!setQuerySyntax(query)) {
    throw new PolygraphError(ERRORS.INVALID_SET_QUERY_SYNTAX, {
      query,
      schemaErrors: JSON.stringify(setQuerySyntax.errors, null, 2),
    });
  }
}

export function ensureCreatedResourceFields(schema, resource) {
  const resDef = schema.resources[resource.type];
  const requiredPropKeys = Object.keys(resDef.properties).filter((propKey) => {
    const propDef = resDef.properties[propKey];
    return (
      propDef.type !== "relationship" && !propDef.optional && !("default" in propDef)
    );
  });

  const missingQueryProps = difference(
    requiredPropKeys,
    Object.keys(resource.properties),
  );
  if (missingQueryProps.length > 0) {
    throw new PolygraphError(ERRORS.QUERY_MISSING_CREATE_FIELDS, {
      resource,
      missingQueryProps,
    });
  }
}
