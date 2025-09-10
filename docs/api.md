# API Reference

Complete reference for Data Prism core functions and store interfaces.

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

All Data Prism stores implement this standard interface:

### store.query(query)
Execute a query and return results.

**Parameters:**
- `query` (`Query`) - The query object

**Returns:** `Promise<any[]>` - Array of query results

**Example:**
```javascript
const users = await store.query({
  type: 'users',
  select: ['name', 'email'],
  where: { active: true }
});
```

### store.create(resource)
Create a new resource.

**Parameters:**
- `resource` (`NormalResourceTree`) - Resource to create

**Returns:** `Promise<NormalResourceTree>` - Created resource with ID

**Example:**
```javascript
const newUser = await store.create({
  type: 'users',
  attributes: { name: 'Alice', email: 'alice@example.com' }
});
```

### store.update(resource)
Update an existing resource.

**Parameters:**
- `resource` (`NormalResourceTree`) - Resource to update (must include ID)

**Returns:** `Promise<NormalResourceTree>` - Updated resource

**Example:**
```javascript
const updatedUser = await store.update({
  type: 'users',
  id: '1',
  attributes: { name: 'Alice Smith' }
});
```

### store.upsert(resource)
Create or update a resource (create if no ID, update if ID exists).

**Parameters:**
- `resource` (`NormalResourceTree`) - Resource to upsert

**Returns:** `Promise<NormalResourceTree>` - Created or updated resource

**Example:**
```javascript
const user = await store.upsert({
  type: 'users',
  id: '1', // Will update if exists, create if not
  attributes: { name: 'Alice', email: 'alice@example.com' }
});
```

### store.delete(resource)
Delete a resource.

**Parameters:**
- `resource` (`ResourceRef`) - Resource reference to delete

**Returns:** `Promise<void>`

**Example:**
```javascript
await store.delete({ type: 'users', id: '1' });
```

## Core Functions

### ensureValidSchema(schema, options)
Validate a schema and throw error if invalid.

**Parameters:**
- `schema` (`Schema`) - Schema to validate
- `options` (`Object`) - Validation options
  - `validator` (`Ajv`) - AJV validator instance

**Throws:** `Error` if schema is invalid

**Example:**
```javascript
import { ensureValidSchema } from '@data-prism/core';

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
const normalQuery = normalizeQuery(schema, query, { selectEngine, whereEngine });
```

### ensureValidQuery(schema, query, options)
Validate a query and throw error if invalid.

**Parameters:**
- `schema` (`Schema`) - Schema for validation
- `query` (`NormalizedQuery`) - Query to validate
- `options` (`Object`) - Validation options

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
const results = queryGraph(schema, normalizedQuery, graph, { selectEngine, whereEngine });
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
  console.error('Schema errors:', result.errors);
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

### normalizeResource(schema, resource)
Normalize a resource to standard form.

**Parameters:**
- `schema` (`Schema`) - Schema definition
- `resource` (`ResourceTree`) - Resource to normalize

**Returns:** `NormalResourceTree` - Normalized resource

### createResource(resourceData)
Create a resource object with generated ID if needed.

**Parameters:**
- `resourceData` (`Object`) - Resource data

**Returns:** `NormalResourceTree` - Created resource with ID

### mergeResources(target, source)
Merge two resources, with source taking precedence.

**Parameters:**
- `target` (`NormalResourceTree`) - Target resource
- `source` (`NormalResourceTree`) - Source resource

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

### mergeGraphs(target, source)
Shallow merge two graphs.

**Parameters:**
- `target` (`Graph`) - Target graph
- `source` (`Graph`) - Source graph

**Returns:** `Graph` - Merged graph

### mergeGraphsDeep(target, source)
Deep merge two graphs, merging resources by ID.

**Parameters:**
- `target` (`Graph`) - Target graph
- `source` (`Graph`) - Source graph  

**Returns:** `Graph` - Deep merged graph

**Example:**
```javascript
const mergedGraph = mergeGraphsDeep(existingGraph, newData);
```

### createGraphFromResources(resources)
Create a graph from an array of resources.

**Parameters:**
- `resources` (`NormalResourceTree[]`) - Array of resources

**Returns:** `Graph` - Graph containing the resources

## Expression Engines

### defaultSelectEngine
Default expression engine for SELECT clauses.

**Type:** `SelectExpressionEngine`

**Usage:**
```javascript
import { defaultSelectEngine } from '@data-prism/core';

const result = queryGraph(schema, query, graph, { 
  selectEngine: defaultSelectEngine 
});
```

### defaultWhereEngine  
Default expression engine for WHERE clauses.

**Type:** `WhereExpressionEngine`

**Usage:**
```javascript
import { defaultWhereEngine } from '@data-prism/core';

const result = queryGraph(schema, query, graph, { 
  whereEngine: defaultWhereEngine 
});
```

### createValidator(schema)
Create an AJV validator for a schema.

**Parameters:**
- `schema` (`Schema`) - Schema to create validator for

**Returns:** `Ajv` - Configured AJV validator instance

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
 * @property {Object<string, RelationshipDefinition>} [relationships] - Relationship definitions
 * @property {string[]} [requiredAttributes] - Required attribute names
 */
```

### AttributeDefinition
```javascript
/**
 * @typedef {Object} AttributeDefinition
 * @property {string} type - JSON Schema type (string, number, boolean, etc.)
 * @property {*} [default] - Default value
 * Additional JSON Schema properties allowed
 */
```

### RelationshipDefinition
```javascript
/**
 * @typedef {Object} RelationshipDefinition
 * @property {string} type - Target resource type
 * @property {string} cardinality - Relationship cardinality ('hasOne', 'hasMany', 'belongsTo')
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
 * @typedef {string|string[]|Object} SelectClause
 * - string: Single field or "*" for all
 * - string[]: Array of field names
 * - Object: Field mappings and expressions
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
 * @typedef {Object<string, Object<string, NormalResourceTree>>} Graph
 * Map of resource types to maps of resource IDs to resources
 */
```

### ValidationResult
```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
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
- [Expression Guide](expressions.md) - Expression usage patterns
- [Store Integration](stores.md) - Working with different stores
- [Store Creation](store-creation.md) - Building custom stores