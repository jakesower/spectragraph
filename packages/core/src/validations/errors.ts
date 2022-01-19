import { DefinedError } from "ajv";
import {
  DataTree, NormalResource, ResourceRef, Schema,
} from "../types";

const errorCodeFormat = /^PG-\d{4}$/;

export class PolygraphError extends Error {
  details: any;

  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

export class BasePolygraphError extends Error {
  code: string;

  constructor(message, code) {
    super(message);

    if (!code || !errorCodeFormat.test(code)) {
      throw new Error("code must be a seven character code of the form: PG-1234");
    }

    this.code = code;
  }
}

export class PolygraphGetQuerySyntaxError extends BasePolygraphError {
  jsonSchemaErrors: DefinedError[];

  query: any;

  constructor(query, jsonSchemaErrors) {
    super("invalid query syntax in get query", "PG-0001");
    this.query = query;
    this.jsonSchemaErrors = jsonSchemaErrors;
  }
}

export class PolygraphReplaceSyntaxError extends BasePolygraphError {
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

export class PolygraphGraphConsistencyError extends BasePolygraphError {
  constructor() {
    super("one or more inconsistencies found in graph", "PG-0003");
  }
}

export class PolygraphCustomResourceValidationError<S extends Schema> extends BasePolygraphError {
  errors: any[];

  constructor(errors) {
    super("a custom validation failed", "PG-0004");
    this.errors = errors;
  }
}

export class PolygraphToOneValidationError<S extends Schema, RT extends keyof S["resources"]> extends BasePolygraphError {
  erroredResource: NormalResource<S, RT>;

  relationship: keyof S["resources"][RT]["relationships"];

  relatatedResources: ResourceRef<S, RT>[];

  constructor(erroredResource, relationship, relatedResources) {
    super("a resource has a to-one relationship with multiple resources in it", "PG-0005");
    this.erroredResource = erroredResource;
    this.relationship = relationship;
    this.relatatedResources = relatedResources;
  }
}

export class PolygraphResourceTypeError extends BasePolygraphError {
  tree: DataTree;

  path: (string | number)[];

  expectedType: any;

  constructor(tree, path, propDef) {
    super("invalid property value", "PG-0006");
    this.tree = tree;
    this.path = path;
    this.expectedType = propDef.type;
  }
}

export class PolygraphToOneCardinalityMismatchError extends BasePolygraphError {
  tree: DataTree;

  path: (string | number)[];

  constructor(tree, path) {
    super("a to-one relationship has multiple values", "PG-0007");
    this.tree = tree;
    this.path = path;
  }
}
