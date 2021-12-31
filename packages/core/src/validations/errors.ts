import { DefinedError } from "ajv";

const errorCodeFormat = /^PG-\d{4}$/;

export class PolygraphError extends Error {
  code: string;

  constructor(message, code) {
    super(message);

    if (!code || !errorCodeFormat.test(code)) {
      throw new Error("code must be a seven character code of the form: PG-1234");
    }

    this.code = code;
  }
}

export class PolygraphGetQuerySyntaxError extends PolygraphError {
  jsonSchemaErrors: DefinedError[];

  query: any;

  constructor(query, jsonSchemaErrors) {
    super("invalid query syntax in get query", "PG-0001");
    this.query = query;
    this.jsonSchemaErrors = jsonSchemaErrors;
    console.log(jsonSchemaErrors[0])
  }
}

export class PolygraphReplaceSyntaxError extends PolygraphError {
  jsonSchemaErrors: DefinedError[];

  query: any;

  tree: any;

  constructor(query, tree, jsonSchemaErrors) {
    super("invalid query syntax in get query/tree pair", "PG-0002");
    this.jsonSchemaErrors = jsonSchemaErrors;
    this.query = query;
    this.tree = tree;
  }
}
