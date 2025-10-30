# API Reference

Complete reference for SpectraGraph core functions and store interfaces.

## Table of Contents

- [Store Interface](#store-interface)
- [Core Functions](#core-functions)
- [Schema Validation](#schema-validation)
- [Query Operations](#query-operations)
- [Resource Operations](#resource-operations)
- [Graph Utilities](#graph-utilities)
- [Expression Engines](#expression-engines)
- [Type Definitions](#type-definitions)

## Store Interface

All SpectraGraph stores implement this standard interface:

### store.query(query)

Execute a query and return results.

**Parameters:**

- `query` (`Query`) - The query object

**Returns:** `Promise<any>` - Array of query results

**Example:**

```javascript
const users = await store.query({
  type: "users",
  select: ["name", "email"],
  where: { active: true },
});
```

### store.create(resource)

Create a new resource.

**Parameters:**

- `resource` (`CreateResource`) - Resource to create (normalized format with type)

**Returns:** `Promise<NormalResource>` - Created resource with ID

**Example:**

```javascript
const newUser = await store.create({
  type: "users",
  attributes: { name: "Alice", email: "alice@example.com" },
});
```

### store.update(resource)

Update an existing resource.

**Parameters:**

- `resource` (`UpdateResource`) - Resource to update (must include ID)

**Returns:** `Promise<NormalResource>` - Updated resource

**Example:**

```javascript
const updatedUser = await store.update({
  type: "users",
  id: "1",
  attributes: { name: "Alice Smith" },
});
```

### store.upsert(resource)

Create or update a resource (create if no ID, update if ID exists).

**Parameters:**

- `resource` (`CreateResource | UpdateResource`) - Resource to upsert (normalized format)

**Returns:** `Promise<NormalResource>` - Created or updated resource

**Example:**

```javascript
const user = await store.upsert({
  type: "users",
  id: "1", // Will update if exists, create if not
  attributes: { name: "Alice", email: "alice@example.com" },
});
```

### store.delete(resource)

Delete a resource.

**Parameters:**

- `resource` (`ResourceRef`) - Resource reference to delete

**Returns:** `Promise<void>`

**Example:**

```javascript
await store.delete({ type: "users", id: "1" });
```

## Core Functions

Core functions are primarily used during store building. They are all pure functions.

### ensureValidSchema(schema, options)

Validate a schema and throw error if invalid.

**Parameters:**

- `schema` (`Schema`) - Schema to validate
- `options` (`Object`) - Validation options
  - `validator` (`Ajv`) - AJV validator instance

**Throws:** `Error` if schema is invalid

**Example:**

```javascript
import { ensureValidSchema } from "@spectragraph/core";

ensureValidSchema(schema, { validator });
```

### normalizeQuery(schema, query, options)

Normalize a query to standard form.

**Parameters:**

- `schema` (`Schema`) - Schema for validation
- `query` (`Query`) - Query to normalize
- `options` (`Object`) - Options
  - `selectEngine` (`SelectExpressionEngine`) - Expression engine for select
  - `whereEngine` (`WhereExpressionEngine`) - Expression engine for where

**Returns:** `NormalizedQuery` - Normalized query object

**Example:**

```javascript
const normalQuery = normalizeQuery(schema, query, {
  selectEngine,
  whereEngine,
});
```

### ensureValidQuery(schema, query, options)

Validate a query and throw error if invalid.

**Parameters:**

- `schema` (`Schema`) - Schema for validation
- `query` (`NormalizedQuery`) - Query to validate
- `options` (`Object`) - Validation options
  - `selectEngine` (`SelectExpressionEngine`) - Expression engine for select
  - `whereEngine` (`WhereExpressionEngine`) - Expression engine for where

**Throws:** `Error` if query is invalid

### queryGraph(schema, query, graph, options)

Execute a query against an in-memory graph.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `query` (`NormalizedQuery`) - Normalized query
- `graph` (`Graph`) - Graph data structure
- `options` (`Object`) - Query options

**Returns:** `any[]` - Query results

**Example:**

```javascript
const results = queryGraph(schema, normalizedQuery, graph, {
  selectEngine,
  whereEngine,
});
```

## Schema Validation

### validateSchema(schema, options)

Validate a schema object.

**Parameters:**

- `schema` (`Schema`) - Schema to validate
- `options` (`Object`) - Validation options

**Returns:** `ValidationResult` - Validation result with errors if any

**Example:**

```javascript
const result = validateSchema(schema, { validator });
if (!result.valid) {
  console.error("Schema errors:", result.errors);
}
```

## Query Operations

### validateQuery(schema, query, options)

Validate a query against a schema.

**Parameters:**

- `schema` (`Schema`) - Schema for validation
- `query` (`NormalizedQuery`) - Query to validate
- `options` (`Object`) - Validation options

**Returns:** `ValidationResult` - Validation result

## Resource Operations

### ensureValidCreateResource(schema, resource, validator)

Validate resource for creation.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `resource` (`NormalResourceTree`) - Resource to validate
- `validator` (`Ajv`) - Validator instance

**Throws:** `Error` if resource is invalid for creation

### ensureValidUpdateResource(schema, resource, validator)

Validate resource for updating.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `resource` (`NormalResourceTree`) - Resource to validate
- `validator` (`Ajv`) - Validator instance

**Throws:** `Error` if resource is invalid for updating

### ensureValidDeleteResource(schema, resource, validator)

Validate resource reference for deletion.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `resource` (`ResourceRef`) - Resource reference to validate
- `validator` (`Ajv`) - Validator instance

**Throws:** `Error` if resource reference is invalid

### normalizeResource(schema, resourceType, resource)

Convert a flat resource to normalized form with type/id/attributes/relationships structure.

Flat resources have attributes and relationship IDs mixed at the root level.
Normalized resources separate them into explicit attributes and relationships objects,
with relationships converted to {type, id} reference objects.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `resourceType` (`string`) - The type of resource to normalize
- `resource` (`FlatResource`) - Flat resource with mixed attributes and relationships

**Returns:** `NormalResource` - Normalized resource with separated attributes and relationships

**Example:**

```javascript
const flatUser = {
  id: "1",
  name: "Alice",
  email: "alice@example.com",
  company: "acme",
};
const normalized = normalizeResource(schema, "users", flatUser);
// Returns:
// {
//   type: "users",
//   id: "1",
//   attributes: { id: "1", name: "Alice", email: "alice@example.com" },
//   relationships: { company: { type: "companies", id: "acme" } }
// }
```

### createResource(schema, resourceType, partialResource)

Create a normalized resource with schema defaults applied. Takes flat resource format and returns normalized format.

This function applies schema defaults to any missing attributes and relationships, then normalizes the result.
Calling it with an empty partial resource is useful to get a resource with all defaults applied.

**Parameters:**

- `schema` (`Schema`) - Schema definition
- `resourceType` (`string`) - The type of resource to create
- `partialResource` (`FlatResource`) - Partial flat resource (defaults will be applied for missing fields)

**Returns:** `NormalResource` - Normalized resource with defaults applied

**Example:**

```javascript
// Create with partial data - defaults will fill in missing fields
const user = createResource(schema, "users", { name: "Alice" });
// If schema defines default email: "user@example.com", result will be:
// {
//   type: "users",
//   id: undefined,
//   attributes: { name: "Alice", email: "user@example.com" },
//   relationships: {}
// }

// Create with all defaults
const emptyUser = createResource(schema, "users", {});
```

### mergeResources(left, right)

Merge two resources, with right taking precedence.

**Parameters:**

- `left` (`NormalResourceTree`) - One resource
- `right` (`NormalResourceTree`) - The other resource

**Returns:** `NormalResourceTree` - Merged resource

## Graph Utilities

### createEmptyGraph(schema)

Create an empty graph structure from schema.

**Parameters:**

- `schema` (`Schema`) - Schema definition

**Returns:** `Graph` - Empty graph with resource type containers

**Example:**

```javascript
const emptyGraph = createEmptyGraph(schema);
// Returns: { users: {}, posts: {}, ... }
```

### linkInverses(schema, graph)

Link inverse relationships in a graph.

**Parameters:**

- `schema` (`Schema`) - Schema with relationship definitions
- `graph` (`Graph`) - Graph to process

**Returns:** `Graph` - Graph with inverse relationships linked

**Example:**

```javascript
const linkedGraph = linkInverses(schema, graph);
```

### mergeGraphs(left, right)

Shallow merge two graphs.

**Parameters:**

- `left` (`Graph`) - One graph
- `right` (`Graph`) - The other graph

**Returns:** `Graph` - Merged graph

### mergeGraphsDeep(left, right)

Deep merge two graphs, merging resources by ID.

**Parameters:**

- `left` (`Graph`) - One graph
- `right` (`Graph`) - The other graph (takes precedence)

**Returns:** `Graph` - Deep merged graph

**Example:**

```javascript
const mergedGraph = mergeGraphsDeep(existingGraph, newData);
```

### createGraphFromResources(schema, rootResourceType, resources)

Create a graph from an array of flat resources, normalizing them and extracting nested resources.

This function walks through flat resources (which may have nested flat resources in relationships),
normalizes everything, and creates a graph structure with all resources organized by type and ID.

**Parameters:**

- `schema` (`Schema`) - Schema with relationship definitions
- `rootResourceType` (`string`) - The type of resource at the top level
- `resources` (`FlatResource[]`) - Array of flat resources; these may contain nested flat resources

**Returns:** `Graph` - Graph containing normalized resources and their nested resources

**Example:**

```javascript
const flatUsers = [
  {
    id: "1",
    name: "Alice",
    company: { id: "acme", name: "ACME Corp" }, // Nested flat resource
  },
  { id: "2", name: "Bob", company: "acme" }, // Reference by ID
];

const graph = createGraphFromResources(schema, "users", flatUsers);
// Returns:
// {
//   users: {
//     "1": { type: "users", id: "1", attributes: {...}, relationships: {...} },
//     "2": { type: "users", id: "2", attributes: {...}, relationships: {...} }
//   },
//   companies: {
//     "acme": { type: "companies", id: "acme", attributes: {...}, relationships: {} }
//   }
// }
```

## Expression Engines

### defaultSelectEngine

Default expression engine for SELECT clauses.

**Type:** `SelectExpressionEngine`

**Usage:**

```javascript
import { defaultSelectEngine } from "@spectragraph/core";

const result = queryGraph(schema, query, graph, {
  selectEngine: defaultSelectEngine,
});
```

### defaultWhereEngine

Default expression engine for WHERE clauses.

**Type:** `WhereExpressionEngine`

**Usage:**

```javascript
import { defaultWhereEngine } from "@spectragraph/core";

const result = queryGraph(schema, query, graph, {
  whereEngine: defaultWhereEngine,
});
```

## Validators

### defaultValidator

Default expression engine for WHERE clauses.

**Type:** `Ajv`

**Usage:**

```javascript
import { defaultValidator } from "@spectragraph/core";

const result = validateCreateResource(schema, resource, {
  validator: defaultValidator,
});
```

### createValidator(options)

Create an AJV validator for a schema.

**Parameters:**

- `options` (`Object`)
  - `ajvSchemas` (`Array`) - An array of schemas to use in validation (uses AJV's `addSchema`) - https://ajv.js.org/guide/managing-schemas.html

**Returns:** `Ajv` - Configured AJV validator instance

## Error Handling

### ExpressionNotSupportedError

Error thrown when a store doesn't support a specific expression.

**Constructor:**

```javascript
new ExpressionNotSupportedError(expression, storeName, reason?)
```

**Parameters:**

- `expression` (`string`) - The unsupported expression (e.g., "$matchesRegex")
- `storeName` (`string`) - Name of the store that doesn't support it
- `reason` (`string`, optional) - Why the expression isn't supported

**Usage in stores:**

```javascript
import { ExpressionNotSupportedError } from "@spectragraph/core";

// In a custom expression engine
const customWhereEngine = {
  expressions: {
    $matchesRegex: (field, pattern) => {
      throw new ExpressionNotSupportedError(
        "$matchesRegex",
        "MyCustomStore",
        "Regular expressions not supported by backend API",
      );
    },
  },
};
```

**Interface tests:** The interface tests automatically skip tests that throw this error, allowing stores to declare unsupported expressions gracefully.

### StoreOperationNotSupportedError

Error thrown when a store doesn't support a specific operation (create, update, delete, etc.).

**Constructor:**

```javascript
new StoreOperationNotSupportedError(operation, storeName, reason?)
```

**Parameters:**

- `operation` (`string`) - The unsupported operation (e.g., "create", "update", "delete")
- `storeName` (`string`) - Name of the store that doesn't support it
- `reason` (`string`, optional) - Why the operation isn't supported

**Usage in stores:**

```javascript
import { StoreOperationNotSupportedError } from "@spectragraph/core";

export function createReadOnlyStore(schema, apiClient) {
  return {
    // Query is supported
    async query(query) {
      // Implementation here
    },

    // Write operations are not supported
    async create(resource) {
      throw new StoreOperationNotSupportedError(
        "create",
        "ReadOnlyStore",
        "This store provides read-only access to the API",
      );
    },

    async update(resource) {
      throw new StoreOperationNotSupportedError(
        "update",
        "ReadOnlyStore",
        "This store provides read-only access to the API",
      );
    },

    async delete(resource) {
      throw new StoreOperationNotSupportedError(
        "delete",
        "ReadOnlyStore",
        "This store provides read-only access to the API",
      );
    },
  };
}
```

**Interface tests:** The interface tests automatically skip operation tests when stores throw this error, allowing read-only stores and stores with partial operation support to pass interface compliance tests.

**Common use cases:**

- **Read-only stores**: Analytics databases, cached views, or API endpoints without write access
- **Selective operation support**: Stores that support some operations but not others
- **Gradual implementation**: Stores that implement operations incrementally during development

### Read-Only Store Example

Here's a complete example of a read-only store that connects to an analytics API:

```javascript
import {
  StoreOperationNotSupportedError,
  ensureValidSchema,
  ensureValidQuery,
  normalizeQuery,
  defaultSelectEngine,
  defaultWhereEngine
} from "@spectragraph/core";

export function createAnalyticsStore(schema, apiClient, config = {}) {
  const {
    selectEngine = defaultSelectEngine,
    whereEngine = defaultWhereEngine,
  } = config;

  ensureValidSchema(schema);

  return {
    async query(query) {
      const normalizedQuery = normalizeQuery(schema, query, {
        selectEngine,
        whereEngine,
      });
      ensureValidQuery(schema, normalizedQuery, { selectEngine, whereEngine });

      // Convert SpectraGraph query to analytics API format
      const apiParams = convertToAnalyticsQuery(normalizedQuery);

      // Fetch from read-only analytics API
      const response = await apiClient.get('/analytics/query', { params: apiParams });

      // Convert back to SpectraGraph format
      return convertFromAnalyticsFormat(response.data);
    },

    // All write operations throw StoreOperationNotSupportedError
    async create(resource) {
      throw new StoreOperationNotSupportedError(
        "create",
        "AnalyticsStore",
        "Analytics data is read-only and computed from source systems"
      );
    },

    async update(resource) {
      throw new StoreOperationNotSupportedError(
        "update",
        "AnalyticsStore",
        "Analytics data is read-only and computed from source systems"
      );
    },

    async upsert(resource) {
      throw new StoreOperationNotSupportedError(
        "upsert",
        "AnalyticsStore",
        "Analytics data is read-only and computed from source systems"
      );
    },

    async delete(resource) {
      throw new StoreOperationNotSupportedError(
        "delete",
        "AnalyticsStore",
        "Analytics data is read-only and computed from source systems"
      );
    }
  };
}

// Usage
const analyticsStore = createAnalyticsStore(schema, apiClient);

// This works - querying read-only data
const metrics = await analyticsStore.query({
  type: "dailyMetrics",
  select: ["date", "revenue", "users"],
  where: { date: { $gte: "2024-01-01" } }
});

// These will throw StoreOperationNotSupportedError
try {
  await analyticsStore.create({ type: "dailyMetrics", attributes: {...} });
} catch (error) {
  if (error instanceof StoreOperationNotSupportedError) {
    console.log("Expected: Analytics store is read-only");
  }
}
```

**Interface test compatibility:** When running interface tests on this store:

```javascript
import { runInterfaceTests } from "@spectragraph/interface-tests";
import { createAnalyticsStore } from "./analytics-store.js";

// Interface tests will automatically skip CUD operation tests
// and only run query tests
runInterfaceTests(() => createAnalyticsStore(schema, mockApiClient));
```

The interface tests will show output like:

```
Skipping Create Operations: Store does not support create operations
Skipping Update Operations: Store does not support update operations
Skipping Delete Operations: Store does not support delete operations
Skipping Upsert Operations: Store does not support upsert operations
```

## Type Definitions

### Schema

```javascript
/**
 * @typedef {Object} Schema
 * @property {Object<string, ResourceDefinition>} resources - Resource type definitions
 */
```

### ResourceDefinition

```javascript
/**
 * @typedef {Object} ResourceDefinition
 * @property {string} [idAttribute='id'] - Custom ID attribute name
 * @property {Object<string, AttributeDefinition>} attributes - Attribute definitions
 * @property {Object<string, RelationshipDefinition>} relationships - Relationship definitions
 * @property {string[]} [requiredAttributes] - Required attribute names
 * @property {string[]} [requiredRelationships] - Required relationship names
 */
```

### AttributeDefinition

```javascript
/**
 * @typedef {Object} AttributeDefinition
 * @property {string} type - JSON Schema definition (often just a type, e.g. { "type": "string" }). SpectraGraph honors defaults set here.
 * Additional JSON Schema properties allowed
 */
```

### RelationshipDefinition

```javascript
/**
 * @typedef {Object} RelationshipDefinition
 * @property {string} type - Target resource type
 * @property {string} cardinality - Relationship cardinality ('one', 'many')
 * @property {string} [inverse] - Name of inverse relationship
 */
```

### Query

```javascript
/**
 * @typedef {Object} Query
 * @property {string} type - Resource type to query
 * @property {string} [id] - Specific resource ID
 * @property {SelectClause} select - Fields to select
 * @property {WhereClause} [where] - Filter conditions
 * @property {OrderClause} [order] - Sorting specification
 * @property {number} [limit] - Maximum results
 * @property {number} [offset] - Results to skip
 */
```

### SelectClause

```javascript
/**
 * @typedef {string|Query|SelectClause} SelectClause
 * - string: "*" for all
 * - string[]: Array field names, "*", or SelectClause objects
 * - Object: Field mappings, expressions, and relationships
 */
```

### WhereClause

```javascript
/**
 * @typedef {Object} WhereClause
 * Field names map to values or expression objects:
 * - Direct values: { active: true }
 * - Expressions: { age: { $gt: 18 } }
 * - Logical operators: { $and: [...], $or: [...] }
 */
```

### OrderClause

```javascript
/**
 * @typedef {Object|Object[]} OrderClause
 * - Object: { fieldName: 'asc'|'desc' }
 * - Object[]: Array of sort specifications
 */
```

### NormalResourceTree

```javascript
/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type - Resource type
 * @property {string} id - Resource ID
 * @property {Object<string, *>} [attributes] - Resource attributes
 * @property {Object<string, ResourceRef|ResourceRef[]>} [relationships] - Related resources
 */
```

### NormalResourceTree

```javascript
/**
 * @typedef {Object} NormalResourceTree
 * @property {string} type - Resource type
 * @property {string} id - Resource ID
 * @property {Object<string, *>} [attributes] - Resource attributes
 * @property {Object<string, ResourceRef|ResourceRef[]|NormalResourceTree|NormalResourceTree[]>} [relationships] - Related resources
 */
```

### ResourceRef

```javascript
/**
 * @typedef {Object} ResourceRef
 * @property {string} type - Resource type
 * @property {string} id - Resource ID
 */
```

### Graph

```javascript
/**
 * @typedef {Object<string, Object<string, NormalResource>>} Graph
 * Map of resource types to maps of resource IDs to resources
 */
```

### ValidationResult

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {Error[]} [errors] - Validation errors if any
 */
```

### ExpressionEngine

```javascript
/**
 * @typedef {Object} ExpressionEngine
 * @property {Object<string, function>} expressions - Map of expression handlers
 */
```

For practical usage examples, see:

- [Query Guide](query.md) - Complete query language reference
- [Schema Guide](schema.md) - Schema definition examples
- [Expression Guide](https://github.com/jakesower/json-expressions) - Expression usage patterns (json-expressions)
- [Store Creation](store-creation.md) - Building custom stores
