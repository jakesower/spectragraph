import Ajv from "ajv";
import { Schema } from "../types";
import { makeQuerySchema } from "./syntax/make-query-schema";
import { makeQueryTreeSchema } from "./syntax/make-query-tree-schema";

export function syntaxValidations<S extends Schema>(schema: S) {
  const querySchema = makeQuerySchema(schema);
  const queryTreeSchema = makeQueryTreeSchema(schema);

  const ajv = new Ajv({ $data: true, schemas: [querySchema, queryTreeSchema] });

  return {
    querySyntax: ajv.getSchema(`schemas/${schema.urlName}/query-schema`),
    queryTreeSyntax: ajv.getSchema(`schemas/${schema.urlName}/query-tree-schema`),
  };
}
