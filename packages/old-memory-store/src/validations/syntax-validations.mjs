import Ajv from "ajv";
import { makeQuerySchema } from "./syntax/make-query-schema.mjs";
import { makeQueryTreeSchema } from "./syntax/make-query-tree-schema.mjs";
import { constraintDefinitions } from "../memory-store/operations/constraints/constraint-definitions.mjs";

export function syntaxValidations(schema) {
  const getQuerySchema = makeQuerySchema(schema, true);
  const setQuerySchema = makeQuerySchema(schema, false);
  const queryTreeSchema = makeQueryTreeSchema(schema);

  const ajv = new Ajv({
    $data: true,
    schemas: [getQuerySchema, setQuerySchema, queryTreeSchema],
  });
  ajv.addVocabulary(Object.keys(constraintDefinitions));

  return {
    getQuerySyntax: ajv.getSchema(
      `schemas/${schema.urlName}/query-schema-with-rel-props`,
    ),
    setQuerySyntax: ajv.getSchema(`schemas/${schema.urlName}/query-schema`),
    queryTreeSyntax: ajv.getSchema(`schemas/${schema.urlName}/query-tree-schema`),
  };
}
