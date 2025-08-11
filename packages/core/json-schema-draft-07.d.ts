// TypeScript type definitions for JSON Schema Draft 07
// Based on http://json-schema.org/draft-07/schema#

export type JSONSchemaType = 
  | "null" 
  | "boolean" 
  | "object" 
  | "array" 
  | "number" 
  | "string" 
  | "integer";

export interface JSONSchemaDefinition {
  [key: string]: JSONSchema;
}

export interface JSONSchema {
  // Schema identification
  $id?: string;
  $schema?: string;
  $ref?: string;
  $comment?: string;

  // Meta-data
  title?: string;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];

  // Type validation
  type?: JSONSchemaType | JSONSchemaType[];
  
  // Numeric validation
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  // String validation
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Array validation
  items?: JSONSchema | JSONSchema[];
  additionalItems?: JSONSchema;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchema;

  // Object validation
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: { [key: string]: JSONSchema };
  patternProperties?: { [pattern: string]: JSONSchema };
  additionalProperties?: JSONSchema | boolean;
  dependencies?: {
    [key: string]: JSONSchema | string[];
  };
  propertyNames?: JSONSchema;

  // Generic validation
  const?: unknown;
  enum?: unknown[];

  // Combining schemas
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // Conditional schemas
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;

  // Format validation (Draft 07 formats)
  format?: 
    | "date-time"
    | "time" 
    | "date"
    | "duration"
    | "email"
    | "idn-email"
    | "hostname"
    | "idn-hostname"
    | "ipv4"
    | "ipv6"
    | "uri"
    | "uri-reference"
    | "iri"
    | "iri-reference"
    | "uri-template"
    | "json-pointer"
    | "relative-json-pointer"
    | "regex"
    | string; // Allow custom formats

  // Schema composition
  definitions?: JSONSchemaDefinition;
  $defs?: JSONSchemaDefinition;

  // Content validation (Draft 07)
  contentMediaType?: string;
  contentEncoding?: string;

  // Allow additional properties for extensions
  [key: string]: unknown;
}

// Root schema interface
export interface JSONSchemaRoot extends JSONSchema {
  $schema: "http://json-schema.org/draft-07/schema#" | string;
}

// Type guards
export function isJSONSchema(value: unknown): value is JSONSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJSONSchemaRoot(value: unknown): value is JSONSchemaRoot {
  return isJSONSchema(value) && typeof (value as any).$schema === 'string';
}

// Utility types
export type JSONSchemaBoolean = boolean;
export type JSONSchemaObject = JSONSchema;
export type JSONSchemaArray = JSONSchema[];

// Combined type for schema values
export type JSONSchemaValue = JSONSchema | JSONSchemaBoolean;

// Type for schema references
export interface JSONSchemaReference {
  $ref: string;
}

export function isJSONSchemaReference(value: unknown): value is JSONSchemaReference {
  return typeof value === 'object' && 
         value !== null && 
         '$ref' in value && 
         typeof (value as any).$ref === 'string';
}