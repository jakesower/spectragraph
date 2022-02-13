import Ajv from "ajv";
import { makeQuerySchema } from "./syntax/make-query-schema.mjs";
import { makeQueryTreeSchema } from "./syntax/make-query-tree-schema.mjs";

export function syntaxValidations(schema) {
  const querySchema = makeQuerySchema(schema);
  const queryTreeSchema = makeQueryTreeSchema(schema);

  const ajv = new Ajv({ $data: true, schemas: [querySchema, queryTreeSchema] });

  return {
    querySyntax: ajv.getSchema(`schemas/${schema.urlName}/query-schema`),
    queryTreeSyntax: ajv.getSchema(`schemas/${schema.urlName}/query-tree-schema`),
  };
}
