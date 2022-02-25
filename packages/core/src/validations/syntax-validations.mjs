import Ajv from "ajv";
import { makeQuerySchema } from "./syntax/make-query-schema.mjs";
import { makeQueryTreeSchema } from "./syntax/make-query-tree-schema.mjs";

export function syntaxValidations(schema) {
  const querySchema = makeQuerySchema(schema, true);
  const setQuerySchema = makeQuerySchema(schema, false);
  const queryTreeSchema = makeQueryTreeSchema(schema);

  const ajv = new Ajv({
    $data: true,
    schemas: [
      querySchema,
      setQuerySchema,
      queryTreeSchema],
  });

  return {
    querySyntax: ajv.getSchema(`schemas/${schema.urlName}/query-schema-with-rel-props`),
    querySyntaxNoRels: ajv.getSchema(`schemas/${schema.urlName}/query-schema`),
    queryTreeSyntax: ajv.getSchema(`schemas/${schema.urlName}/query-tree-schema`),
  };
}
