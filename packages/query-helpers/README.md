# SpectraGraph Query Helpers

Utility functions for working with SpectraGraph queries. This package provides helper functions for query traversal and analysis, making it easier to work with complex nested query structures.

## Overview

SpectraGraph Query Helpers provides tools for:

- **Query Traversal**: Flatten and iterate over nested query structures
- **Query Analysis**: Inspect and manipulate query structures programmatically

## Installation

```bash
npm install @spectragraph/query-helpers
```

## Core Concepts

### Query Flattening

Query helpers can flatten nested queries into linear arrays of query breakdown items, making it easier to process complex relationships and analyze query structures programmatically.

## API Reference

### Query Traversal Functions

#### `flattenQuery(schema, rootQuery)`

Flattens a nested query into a linear array of query breakdown items.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `rootQuery` (RootQuery) - The root query to flatten

**Returns:** QueryBreakdown - Array of flattened query breakdown items

```javascript
import { flattenQuery } from "@spectragraph/query-helpers";

const breakdown = flattenQuery(schema, {
  type: "teams",
  select: {
    name: "name",
    homeMatches: {
      select: {
        field: "field",
        awayTeam: { select: ["name"] },
      },
    },
  },
});

// Returns array with separate items for teams, matches, and related teams
console.log(breakdown.map((item) => item.type)); // ["teams", "matches", "teams"]
```

#### `flatMapQuery(schema, query, fn)`

Maps over each query in a flattened query structure.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `query` (RootQuery) - The root query
- `fn` (Function) - Mapping function `(query, info) => any`

**Returns:** Array of mapped results

```javascript
import { flatMapQuery } from "@spectragraph/query-helpers";

const resourceTypes = flatMapQuery(schema, query, (subquery, info) => ({
  type: info.type,
  path: info.path,
  hasWhere: !!subquery.where,
}));
```

#### `forEachQuery(schema, query, fn)`

Iterates over each query in a flattened query structure.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `query` (RootQuery) - The root query
- `fn` (Function) - Iteration function `(query, info) => void`

```javascript
import { forEachQuery } from "@spectragraph/query-helpers";

forEachQuery(schema, query, (subquery, info) => {
  console.log(`Processing ${info.type} at path: ${info.path.join(".")}`);
});
```

#### `someQuery(schema, query, fn)`

Tests whether some query in a flattened query structure matches a condition.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `query` (RootQuery) - The root query
- `fn` (Function) - Test function `(query, info) => boolean`

**Returns:** Boolean indicating if any query matches the condition

```javascript
import { someQuery } from "@spectragraph/query-helpers";

const hasComplexWhere = someQuery(
  schema,
  query,
  (subquery, info) => subquery.where && Object.keys(subquery.where).length > 2,
);
```

## Type Definitions

### QueryBreakdownItem

```typescript
interface QueryBreakdownItem {
  path: string[]; // Path to this query level
  attributes: any; // Selected attributes
  relationships: any; // Selected relationships
  type: string; // Resource type
  query: Query; // The query object
  parent: QueryBreakdownItem | null; // Parent breakdown item if any
  parentQuery: Query | null; // Parent query if any
  parentRelationship: string | null; // Parent relationship name if any
}
```

## Examples

### Basic Query Traversal

```javascript
import { flattenQuery, forEachQuery } from "@spectragraph/query-helpers";

const schema = {
  resources: {
    teams: {
      attributes: {
        id: { type: "string" },
        name: { type: "string" },
      },
      relationships: {
        homeMatches: {
          type: "matches",
          cardinality: "many",
          inverse: "homeTeam",
        },
      },
    },
    matches: {
      attributes: {
        id: { type: "string" },
        field: { type: "string" },
      },
      relationships: {
        homeTeam: { type: "teams", cardinality: "one", inverse: "homeMatches" },
      },
    },
  },
};

const query = {
  type: "teams",
  select: {
    name: "name",
    homeMatches: {
      select: {
        field: "field",
        homeTeam: { select: ["name"] },
      },
    },
  },
};

// Flatten the query to see all levels
const breakdown = flattenQuery(schema, query);
console.log(
  breakdown.map((item) => ({
    type: item.type,
    path: item.path.join("."),
    attributes: item.attributes,
  })),
);

// Iterate over each query level
forEachQuery(schema, query, (subquery, info) => {
  console.log(`${info.type}: ${info.attributes.join(", ")}`);
});
```

### Query Analysis

```javascript
import { someQuery, flatMapQuery } from "@spectragraph/query-helpers";

// Check if any subquery has complex filtering
const hasComplexFilters = someQuery(schema, query, (subquery) => {
  return (
    subquery.where &&
    Object.keys(subquery.where).some(
      (key) =>
        typeof subquery.where[key] === "object" &&
        "$and" in subquery.where[key],
    )
  );
});

// Extract all resource types used in the query
const resourceTypes = new Set(
  flatMapQuery(schema, query, (_, info) => info.type),
);

// Find all queries that need special permissions
const restrictedQueries = flatMapQuery(schema, query, (subquery, info) => {
  if (subquery.where?.classified === true) {
    return { type: info.type, path: info.path };
  }
  return null;
}).filter(Boolean);
```

## TypeScript Support

SpectraGraph Query Helpers includes comprehensive TypeScript definitions:

```typescript
import type {
  QueryBreakdown,
  QueryBreakdownItem,
} from "@spectragraph/query-helpers";

import type { Schema, RootQuery } from "@spectragraph/core";

// Type-safe usage
const breakdown: QueryBreakdown = flattenQuery(schema, rootQuery);
```

## Related Packages

- `@spectragraph/core` - Core data structures and query execution
- `@spectragraph/memory-store` - In-memory data store implementation
- `@spectragraph/postgres-store` - PostgreSQL backend
- `@spectragraph/jsonapi-store` - JSON:API client store
