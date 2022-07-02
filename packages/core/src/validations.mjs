import Ajv from "ajv";
import { makeQuerySchema } from "./schema/make-query-schema.mjs";
// import { makeQueryTreeSchema } from "./schema/make-query-tree-schema.mjs";
import { constraintDefinitions } from "./constraints.mjs";
import { ERRORS, PolygraphError } from "./errors.mjs";

export function ensureValidGetQuerySyntax(schema, query) {
  const getQuerySchema = makeQuerySchema(schema, true);

  const ajv = new Ajv({
    $data: true,
    schemas: [getQuerySchema],
  });
  ajv.addVocabulary(Object.keys(constraintDefinitions));

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

// const setQuerySchema = makeQuerySchema(schema, false);
// const queryTreeSchema = makeQueryTreeSchema(schema);

// const ajv = new Ajv({
//   $data: true,
//   schemas: [getQuerySchema, setQuerySchema, queryTreeSchema],
// });
// ajv.addVocabulary(Object.keys(constraintDefinitions));

// return {
//   getQuerySyntax: ajv.getSchema(
//     `schemas/${schema.urlName}/query-schema-with-rel-props`,
//   ),
//   setQuerySyntax: ajv.getSchema(`schemas/${schema.urlName}/query-schema`),
//   queryTreeSyntax: ajv.getSchema(`schemas/${schema.urlName}/query-tree-schema`),
// };
