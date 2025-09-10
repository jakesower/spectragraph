# Store Creation Guide

This guide walks you through creating custom Data Prism stores. By implementing the store interface, you can make any data source queryable with Data Prism's unified query language.

## Table of Contents

- [Store Interface](#store-interface)
- [Core Toolkit](#core-toolkit)
- [Implementation Patterns](#implementation-patterns)
- [Expression Engines](#expression-engines)
- [Testing Your Store](#testing-your-store)
- [Publishing and Distribution](#publishing-and-distribution)

## Store Interface

All Data Prism stores must implement the following async methods:

```javascript
/**
 * @typedef {Object} Store
 * @property {function(Query): Promise<any[]>} query - Execute a query and return results
 * @property {function(NormalResourceTree): Promise<NormalResourceTree>} create - Create a new resource
 * @property {function(NormalResourceTree): Promise<NormalResourceTree>} update - Update an existing resource
 * @property {function(NormalResourceTree): Promise<NormalResourceTree>} upsert - Create or update a resource
 * @property {function(ResourceRef): Promise<void>} delete - Delete a resource
 */
```

## Core Toolkit

Data Prism core provides essential utilities for store implementation:

### Schema and Query Validation

```javascript
import {
	ensureValidSchema,
	ensureValidQuery,
	normalizeQuery,
	ensureValidCreateResource,
	ensureValidUpdateResource,
	ensureValidDeleteResource,
} from "@data-prism/core";

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
} from "@data-prism/core";

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
} from "@data-prism/core";

/**
 * Creates a custom store for [YOUR_DATA_SOURCE]
 * @param {import('@data-prism/core').Schema} schema - The data schema
 * @param {any} connection - Connection to your data source
 * @param {Object} config - Store configuration options
 */
export function createCustomStore(schema, connection, config = {}) {
	const {
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
			return createResource(connection, resource);
		},

		async update(resource) {
			ensureValidUpdateResource(schema, resource, validator);
			// TODO: Implement resource updating
			return updateResource(connection, resource);
		},

		async upsert(resource) {
			// Common upsert implementation
			const exists = await resourceExists(connection, resource);
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

_Note: This example omits configuration handling for brevity. See [stores.md](stores.md) for complete configuration options._

### HTTP API Store Pattern

For REST API backends:

```javascript
export function createAPIStore(schema, config) {
	return {
		async query(query) {
			const normalizedQuery = normalizeQuery(schema, query);
			ensureValidQuery(schema, normalizedQuery);

			// Convert Data Prism query to API parameters
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

_Note: This example shows core functionality. See [stores.md](stores.md) for configuration options like headers, timeout, and error handling._

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

			// Convert back to Data Prism format
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
import { defaultSelectEngine, defaultWhereEngine } from "@data-prism/core";

// Default engines handle most expressions in JavaScript
const result = queryGraph(schema, query, graph, {
	selectEngine: defaultSelectEngine,
	whereEngine: defaultWhereEngine,
});
```

### Custom Expression Translation

For SQL stores, translate expressions to database-specific syntax:

```javascript
// Custom where engine for PostgreSQL
const postgresWhereEngine = {
	// Translate simple comparisons to SQL
	$eq: (field, value) => `${field} = $${paramIndex++}`,
	$gt: (field, value) => `${field} > $${paramIndex++}`,
	$like: (field, value) => `${field} ILIKE $${paramIndex++}`,

	// Pattern matching
	$matchesRegex: (field, pattern) => `${field} ~* $${paramIndex++}`,

	// Complex expressions fall back to JavaScript
	$custom: (field, expression) => {
		// Return null to indicate JavaScript evaluation needed
		return null;
	},
};
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
		$myCustom: (field, params) => {
			return `CUSTOM_FUNCTION(${field}, ${params})`;
		},
	},
};
```

Note: `@data-prism/core` supports a `ExpressionNotSupportedError` error that should be used for expressions your store doesn't implement. This will be recognized and honored by the interface tests (described below).

## Testing Your Store

### Use Interface Tests

Data Prism provides standard interface tests for all stores:

```javascript
import { runInterfaceTests } from "@data-prism/interface-tests";
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

Use the standard test schema for consistency:

```javascript
import { careBearSchema, careBearData } from "@data-prism/interface-tests";

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
			type: "users",
			select: ["name", { posts: [{ comments: ["content"] }] }],
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

### Package Structure

```
my-custom-store/
├── src/
│   ├── index.js          # Main store implementation
│   ├── query-builder.js  # Query translation logic
│   └── connection.js     # Connection management
├── test/
│   ├── interface.test.js # Interface compliance tests
│   └── custom.test.js    # Store-specific tests
├── dist/                 # Built files
├── package.json
└── README.md
```

### Package.json Configuration

```json
{
	"name": "@my-org/data-prism-custom-store",
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
		"@data-prism/core": ">=0.1.0"
	},
	"dependencies": {
		"my-data-source-client": "^2.0.0"
	},
	"devDependencies": {
		"@data-prism/interface-tests": "*",
		"vitest": "^3.0.0"
	},
	"keywords": ["data-prism", "data-store", "query-engine"]
}
```

### Documentation

Include comprehensive documentation:

```markdown
# @my-org/data-prism-custom-store

Data Prism store for [YOUR_DATA_SOURCE].

## Installation

npm install @my-org/data-prism-custom-store

## Usage

import { createCustomStore } from '@my-org/data-prism-custom-store';

const store = createCustomStore(schema, connection, {
// Configuration options
});

## Configuration Options

- `timeout`: Query timeout in milliseconds (default: 5000)
- `retries`: Number of retry attempts (default: 3)
- `caching`: Enable result caching (default: false)

## Examples

[Include practical examples]

## Limitations

- Does not support [specific features]
- Requires [specific versions or setup]
```

### Store Registry

Consider registering your store in the Data Prism ecosystem:

1. Tag your package with `data-prism-store`
2. Submit to the community store registry
3. Include in Data Prism documentation
4. Participate in compatibility testing

### Best Practices

1. **Follow semantic versioning** for API changes
2. **Maintain backward compatibility** when possible
3. **Document performance characteristics** clearly
4. **Provide migration guides** for breaking changes
5. **Include comprehensive examples** in documentation
6. **Run interface tests** in CI/CD pipeline
7. **Monitor real-world usage** and gather feedback

For more examples, see the existing store implementations:

- [Memory Store](../packages/memory-store/src/memory-store.js)
- [PostgreSQL Store](../packages/postgres-store/src/postgres-store.js)
- [SQLite Store](../packages/sqlite-store/src/sqlite-store.js)

For the complete API reference, see [api.md](api.md).
