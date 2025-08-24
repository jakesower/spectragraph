# Data Prism Interface Tests

A comprehensive test suite for validating Data Prism store implementations. This package provides standardized tests that ensure store implementations properly support CRUD operations, querying, and relationship management according to the Data Prism specification.

## Overview

Data Prism Interface Tests is built around several key principles:

- **Implementation-agnostic**: Tests work with any store implementation that follows the Data Prism interface
- **Comprehensive coverage**: Validates all core operations and edge cases
- **Reusable fixtures**: Provides shared test data and schemas used across the Data Prism ecosystem
- **Modular design**: Run all tests or individual test suites as needed

## Installation

This package is typically used as a development dependency:

```bash
npm install --save-dev @data-prism/interface-tests
```

## Usage

### Running All Interface Tests

```javascript
import { runInterfaceTests } from "@data-prism/interface-tests";
import { createMyStore } from "my-store-implementation";

// Your store factory function
function createStore() {
  return createMyStore(schema, config);
}

// Run all interface tests
runInterfaceTests(createStore);
```

### Running Individual Test Suites

```javascript
import {
  runQueryTests,
  runCreateTests,
  runUpdateTests,
  runDeleteTests,
  runUpsertTests
} from "@data-prism/interface-tests";

describe("My Store Implementation", () => {
  runQueryTests(createStore);
  runCreateTests(createStore);
  runUpdateTests(createStore);
  runDeleteTests(createStore);
  runUpsertTests(createStore);
});
```

### Using Test Fixtures

The package provides standardized test data and schemas:

```javascript
import {
  careBearSchema,
  soccerSchema,
  geojsonSchema,
  jsonApiSchema,
  jsonSchemaTestingSchema,
  careBearData,
  careBearDataFlat
} from "@data-prism/interface-tests";

// Use schemas in your own tests
const store = createStore(careBearSchema);
```

## API Reference

### Test Functions

#### `runInterfaceTests(createStore)`

Runs the complete interface test suite, covering all CRUD operations and querying functionality.

**Parameters:**

- `createStore` (Function) - Factory function that returns a new store instance

```javascript
function createStore() {
  return createMemoryStore(schema, { initialData: {} });
}

runInterfaceTests(createStore);
```

#### `runQueryTests(createStore)`

Tests query functionality including basic queries, relationship traversal, filtering, sorting, and pagination.

#### `runCreateTests(createStore)`

Tests resource creation with validation, relationship linking, and ID generation.

#### `runUpdateTests(createStore)`

Tests resource updates with partial updates, relationship modifications, and validation.

#### `runDeleteTests(createStore)`

Tests resource deletion with relationship cleanup and cascade handling.

#### `runUpsertTests(createStore)`

Tests upsert operations (create-or-update) with conflict resolution.

### Test Fixtures

#### Schemas

- `careBearSchema` - Simple schema with characters and their properties
- `soccerSchema` - Complex schema with teams, matches, and relationships
- `geojsonSchema` - Geographic data schema for spatial testing
- `jsonApiSchema` - JSON:API specification schema
- `jsonSchemaTestingSchema` - Meta-schema for JSON Schema validation

#### Data

- `careBearData` - Normalized graph data matching careBearSchema
- `careBearDataFlat` - Flat resource objects for testing normalization

## Writing Store Implementations

When implementing a Data Prism store, your store should provide these methods:

```javascript
const store = {
  async create(resource) {
    // Create new resource, return normalized resource
  },
  async update(resource) {
    // Update existing resource, return updated normalized resource
  },
  async upsert(resource) {
    // Create or update resource, return normalized resource
  },
  async delete(resource) {
    // Delete resource by type and id
  },
  async query(query) {
    // Execute query, return results matching query structure
  }
};
```

## Test Categories

### Query Tests

- Basic resource retrieval by type and ID
- Relationship traversal (one-to-one, one-to-many, many-to-many)
- Filtering with where clauses
- Sorting with order specifications
- Pagination with limit/offset
- Complex nested queries

### Create Tests

- Resource creation with auto-generated IDs
- Resource creation with specified IDs
- Relationship establishment during creation
- Validation of required fields
- Error handling for invalid data

### Update Tests

- Partial resource updates
- Relationship modifications
- Attribute merging behavior
- Validation during updates
- Error handling for non-existent resources

### Delete Tests

- Resource deletion by reference
- Relationship cleanup after deletion
- Error handling for non-existent resources
- Cascade behavior validation

### Upsert Tests

- Create behavior when resource doesn't exist
- Update behavior when resource exists
- ID resolution and conflict handling
- Relationship establishment in both scenarios

## Examples

### Basic Store Testing

```javascript
import { runInterfaceTests, careBearSchema } from "@data-prism/interface-tests";
import { createMyCustomStore } from "./my-store";

function createStore() {
  return createMyCustomStore(careBearSchema);
}

// This will run hundreds of tests covering all aspects
runInterfaceTests(createStore);
```

### Custom Test Integration

```javascript
import { careBearSchema, careBearData } from "@data-prism/interface-tests";
import { describe, it, expect } from "vitest";

describe("My Custom Store Features", () => {
  it("should handle my special case", async () => {
    const store = createMyCustomStore(careBearSchema, { 
      initialData: careBearData 
    });
    
    const result = await store.query({
      type: "characters",
      select: ["name", "favoriteColor"]
    });
    
    expect(result).toBeDefined();
  });
});
```

## Related Packages

- `@data-prism/core` - Core Data Prism functionality and types
- `@data-prism/memory-store` - Reference implementation passing all interface tests
- `@data-prism/postgres-store` - PostgreSQL store implementation
- `@data-prism/sqlite-store` - SQLite store implementation