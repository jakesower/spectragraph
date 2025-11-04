# Store Creation Guide

This guide walks you through creating custom SpectraGraph stores. By implementing the store interface, you can make any data source queryable with SpectraGraph's unified query language.

## Table of Contents

- [Store Interface](#store-interface)
- [Core Toolkit](#core-toolkit)
- [Implementation Patterns](#implementation-patterns)
- [Expression Engines](#expression-engines)
- [Testing Your Store](#testing-your-store)
- [Publishing and Distribution](#publishing-and-distribution)

## Store Interface

All SpectraGraph stores must implement the following async methods:

```javascript
/**
 * @typedef {Object} Store
 * @property {function(Query): Promise<any[]>} query - Execute a query and return results
 * @property {function(CreateResource): Promise<NormalResource>} create - Create a new resource (normalized format)
 * @property {function(UpdateResource): Promise<NormalResource>} update - Update an existing resource (normalized format)
 * @property {function(CreateResource | UpdateResource): Promise<NormalResource>} upsert - Create or update a resource (normalized format)
 * @property {function(ResourceRef): Promise<void>} delete - Delete a resource
 */
```

## Core Toolkit

SpectraGraph core provides essential utilities for store implementation:

### Schema and Query Validation

```javascript
import {
  ensureValidSchema,
  ensureValidQuery,
  normalizeQuery,
  ensureValidCreateResource,
  ensureValidUpdateResource,
  ensureValidDeleteResource,
} from "@spectragraph/core";

// Validate schema on store creation
ensureValidSchema(schema, { validator });

// Normalize and validate queries
const normalizedQuery = normalizeQuery(schema, query, {
  selectEngine,
  whereEngine,
});
ensureValidQuery(schema, normalizedQuery, { selectEngine, whereEngine });
```

### Resource Validation

```javascript
// Validate resources before CRUD operations
ensureValidCreateResource(schema, resource, validator);
ensureValidUpdateResource(schema, resource, validator);
ensureValidDeleteResource(schema, resource, validator);
```

### Graph Utilities

```javascript
import {
  createEmptyGraph,
  linkInverses,
  mergeGraphsDeep,
  queryGraph,
} from "@spectragraph/core";

// Create empty graph structure from schema
const emptyGraph = createEmptyGraph(schema);

// Link inverse relationships
const linkedGraph = linkInverses(schema, graph);

// Query graphs (useful for in-memory portions)
const result = queryGraph(schema, query, graph, { selectEngine, whereEngine });
```

## Implementation Patterns

### Basic Store Template

```javascript
import {
  ensureValidSchema,
  ensureValidQuery,
  normalizeQuery,
  ensureValidCreateResource,
  ensureValidUpdateResource,
  ensureValidDeleteResource,
  defaultValidator,
  defaultSelectEngine,
  defaultWhereEngine,
} from "@spectragraph/core";

/**
 * Creates a custom store for [YOUR_DATA_SOURCE]
 * @param {import('@spectragraph/core').Schema} schema - The data schema
 * @param {Object} config - Store configuration options
 */
export function createCustomStore(schema, config = {}) {
  const {
    connection, // unique to this store
    validator = defaultValidator,
    selectEngine = defaultSelectEngine,
    whereEngine = defaultWhereEngine,
  } = config;

  // Validate schema on creation
  ensureValidSchema(schema, { validator });

  return {
    async query(query) {
      // Normalize and validate query
      const normalizedQuery = normalizeQuery(schema, query, {
        selectEngine,
        whereEngine,
      });
      ensureValidQuery(schema, normalizedQuery, { selectEngine, whereEngine });

      // TODO: Implement query execution for your data source
      return executeQuery(connection, normalizedQuery);
    },

    async create(resource) {
      ensureValidCreateResource(schema, resource, validator);
      // TODO: Implement resource creation
      return buildResourceInDataSource(connection, resource);
    },

    async update(resource) {
      ensureValidUpdateResource(schema, resource, validator);
      // TODO: Implement resource updating
      return updateResourceInDataSource(connection, resource);
    },

    async upsert(resource) {
      // Common upsert implementation - check if ID exists
      const exists =
        resource.id &&
        (await resourceExists(connection, resource.type, resource.id));
      return exists ? this.update(resource) : this.create(resource);
    },

    async delete(resource) {
      ensureValidDeleteResource(schema, resource, validator);
      // TODO: Implement resource deletion
      return deleteResource(connection, resource);
    },
  };
}
```

### Memory Store Implementation

Here's how the memory store implements the core interface:

```javascript
export function createMemoryStore(schema, config = {}) {
  ensureValidSchema(schema, { validator });

  let storeGraph = mergeGraphsDeep(createEmptyGraph(schema), initialData);

  return {
    async query(query) {
      const normalQuery = normalizeQuery(schema, query, {
        selectEngine,
        whereEngine,
      });
      ensureValidQuery(schema, normalQuery, { selectEngine, whereEngine });
      return queryGraph(schema, normalQuery, storeGraph, {
        selectEngine,
        whereEngine,
      });
    },

    async create(resource) {
      ensureValidCreateResource(schema, resource, validator);
      return createAction(resource, { schema, storeGraph });
    },

    async update(resource) {
      ensureValidUpdateResource(schema, resource, validator);
      return updateAction(resource, { schema, storeGraph });
    },

    async upsert(resource) {
      return "id" in resource && storeGraph[resource.type][resource.id]
        ? this.update(resource)
        : this.create(resource);
    },

    async delete(resource) {
      ensureValidDeleteResource(schema, resource, validator);
      return deleteAction(resource, { schema, storeGraph });
    },
  };
}
```

_Note: This example omits configuration handling for brevity._

### HTTP API Store Pattern

For REST API backends:

```javascript
export function createAPIStore(schema, config) {
  return {
    async query(query) {
      const normalizedQuery = normalizeQuery(schema, query);
      ensureValidQuery(schema, normalizedQuery);

      // Convert SpectraGraph query to API parameters
      const apiParams = convertToAPIParams(normalizedQuery);

      const response = await fetch(`${baseURL}/${query.type}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // Add query parameters
        ...apiParams,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const apiData = await response.json();
      return convertFromAPIFormat(apiData);
    },

    async create(resource) {
      ensureValidCreateResource(schema, resource, validator);

      const apiData = convertToAPIFormat(resource);
      const response = await fetch(`${baseURL}/${resource.type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      return convertFromAPIFormat(await response.json());
    },

    // ... other methods
  };
}
```

_Note: This example shows core functionality. Configuration options like headers, timeout, and error handling is not included._

### Database Store Pattern

For SQL databases:

```javascript
export function createSQLStore(schema, connection, config) {
  return {
    async query(query) {
      const normalizedQuery = normalizeQuery(schema, query);
      ensureValidQuery(schema, normalizedQuery);

      // Convert to SQL
      const { sql, params } = convertToSQL(schema, normalizedQuery);

      // Execute query
      const rows = await connection.query(sql, params);

      // Convert back to SpectraGraph format
      return convertRowsToResources(rows, schema, normalizedQuery);
    },

    async create(resource) {
      ensureValidCreateResource(schema, resource, validator);

      const { sql, params } = generateInsertSQL(schema, resource);
      const result = await connection.query(sql, params);

      return { ...resource, id: result.insertId };
    },

    async update(resource) {
      ensureValidUpdateResource(schema, resource, validator);

      const { sql, params } = generateUpdateSQL(schema, resource);
      await connection.query(sql, params);

      return resource;
    },

    async delete(resource) {
      ensureValidDeleteResource(schema, resource, validator);

      const { sql, params } = generateDeleteSQL(schema, resource);
      await connection.query(sql, params);
    },
  };
}
```

## Expression Engines

### Using Default Engines

Most stores can use the default expression engines:

```javascript
import { defaultSelectEngine, defaultWhereEngine } from "@spectragraph/core";

// Default engines handle most expressions in JavaScript
const result = queryGraph(schema, query, graph, {
  selectEngine: defaultSelectEngine,
  whereEngine: defaultWhereEngine,
});
```

### Custom Expression Translation (ADVANCED!)

For SQL stores, expressions are implemented with separate engines for generating SQL and extracting variables. Each expression definition has two functions:

- `where`: generates the SQL fragment
- `vars`: extracts the parameters for the SQL query

```javascript
// Example from the postgres-store implementation
const sqlExpressions = {
  $eq: {
    where: () => " = ?",
    vars: (operand) => operand,
  },
  $matchesRegex: {
    where: (operand) => {
      // Handle inline flags like (?i) for case-insensitive
      const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
      if (flagMatch && flagMatch[1].includes("i")) {
        return " ~* ?"; // Case-insensitive regex in PostgreSQL
      }
      return " ~ ?"; // Case-sensitive regex
    },
    vars: (operand) => {
      // Extract and process the regex pattern
      const flagMatch = operand.match(/^\(\?([ims]*)\)(.*)/);
      if (flagMatch) {
        const [, flags, pattern] = flagMatch;
        let processedPattern = pattern;

        // Handle multiline and dotall flags
        if (flags.includes("m")) {
          processedPattern = processedPattern.replace(/\^/g, "(^|(?<=\\n))");
          processedPattern = processedPattern.replace(/\$/g, "(?=\\n|$)");
        }
        if (flags.includes("s")) {
          processedPattern = processedPattern.replace(/\./g, "[\\s\\S]");
        }

        return [processedPattern];
      }
      return [operand];
    },
  },
  $matchesGlob: {
    where: () => " SIMILAR TO ?",
    vars: (operand) => {
      // Convert GLOB pattern to PostgreSQL SIMILAR TO pattern
      return [operand.replace(/\*/g, "%").replace(/\?/g, "_")];
    },
  },
};

// Create the expression engines
export const whereExpressionEngine = createExpressionEngine(
  mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.where })),
);

export const varsExpressionEngine = createExpressionEngine(
  mapValues(sqlExpressions, (expr) => ({ ...expr, evaluate: expr.vars })),
);
```

### Expression Engine Interface

```javascript
/**
 * @typedef {Object} ExpressionEngine
 * @property {Object<string, function>} expressions - Map of expression name to handler
 */

const customEngine = {
  // Each expression handler receives the expression parameters
  expressions: {
    $count: (operand) => `COUNT(${operand})`,
    $sum: (operand) => `SUM(${operand})`,
    $avg: (operand) => `AVG(${operand})`,

    // Custom expressions
    $myCustom: (operand) => {
      const { field, params } = operand;
      return `CUSTOM_FUNCTION(${field}, ${params})`;
    },
  },
};
```

Note: `@spectragraph/core` supports a `ExpressionNotSupportedError` error that should be used for expressions your store doesn't implement. This will be recognized and honored by the interface tests (described below).

## Testing Your Store

### Use Interface Tests

SpectraGraph provides standard interface tests for all stores:

```javascript
import { runInterfaceTests } from "@spectragraph/interface-tests";
import { createMyStore } from "./my-store.js";

describe("My Custom Store", () => {
  let store;

  beforeEach(() => {
    store = createMyStore(testSchema, testConnection);
  });

  // Run standard compliance tests
  runInterfaceTests(() => store);

  // Add store-specific tests
  it("handles custom feature", async () => {
    // Test store-specific functionality
  });
});
```

### Test Schema and Data

You can use the standard test schema for consistency, or create your own. If the Care Bears schema or data is lacking, please submit an issue. We want everyone to be able to get started with testing quickly.

```javascript
import { careBearSchema, careBearData } from "@spectragraph/interface-tests";

// Test with standard data
const store = createMyStore(careBearSchema);
await store.merge(careBearData);

// Run queries
const result = await store.query({
  type: "bears",
  select: ["name", { home: ["name"] }],
});
```

### Store-Specific Tests

```javascript
describe("Custom Store Features", () => {
  it("optimizes complex queries", async () => {
    const query = {
      type: "patrons",
      select: ["name", { loans: [{ reviews: ["content"] }] }],
    };

    const startTime = Date.now();
    const result = await store.query(query);
    const duration = Date.now() - startTime;

    expect(result).toHaveLength(3);
    expect(duration).toBeLessThan(100); // Performance assertion
  });

  it("handles connection failures gracefully", async () => {
    // Simulate connection failure
    mockConnection.reject(new Error("Connection lost"));

    await expect(
      store.query({ type: "users", select: ["name"] }),
    ).rejects.toThrow("Connection lost");
  });
});
```

## Publishing and Distribution

### Package.json Configuration

```json
{
  "name": "@my-org/spectragraph-custom-store",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs.js"
    }
  },
  "peerDependencies": {
    "@spectragraph/core": ">=0.1.0"
  },
  "dependencies": {
    "my-data-source-client": "^2.0.0"
  },
  "devDependencies": {
    "@spectragraph/interface-tests": "*",
    "vitest": "^3.0.0"
  },
  "keywords": ["spectragraph", "data-store", "query-engine"]
}
```

### Documentation

Include comprehensive documentation:

```markdown
# @my-org/spectragraph-custom-store

SpectraGraph store for [YOUR_DATA_SOURCE].

## Installation

npm install @my-org/spectragraph-custom-store

## Usage

import { createCustomStore } from '@my-org/spectragraph-custom-store';

const store = createCustomStore(schema, connection, {
// Configuration options
});

## Examples

For examples, see the existing store implementations:

- [Memory Store](../packages/memory-store/src/memory-store.js)
- [PostgreSQL Store](../packages/postgres-store/src/postgres-store.js)
- [SQLite Store](../packages/sqlite-store/src/sqlite-store.js)

For the complete API reference, see [api.md](api.md).
```
