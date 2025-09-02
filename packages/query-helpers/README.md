# Data Prism Query Helpers

Utility functions for working with Data Prism queries. This package provides helper functions for query traversal, multi-API execution, and query analysis across different store implementations.

## Overview

Data Prism Query Helpers provides tools for:

- **Query Traversal**: Flatten and iterate over nested query structures
- **Multi-API Execution**: Coordinate multiple APIs to fulfill complex queries
- **Query Analysis**: Inspect and manipulate query structures programmatically

## Installation

```bash
npm install @data-prism/query-helpers
```

## Core Concepts

### Query Flattening

Query helpers can flatten nested queries into linear arrays of query breakdown items, making it easier to process complex relationships and analyze query structures.

### Multi-API Coordination

The package provides utilities for executing queries that span multiple APIs or data sources, handling the coordination and graph merging automatically.

## API Reference

### Query Traversal Functions

#### `flattenQuery(schema, rootQuery)`

Flattens a nested query into a linear array of query breakdown items.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `rootQuery` (RootQuery) - The root query to flatten

**Returns:** QueryBreakdown - Array of flattened query breakdown items

```javascript
import { flattenQuery } from "@data-prism/query-helpers";

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
import { flatMapQuery } from "@data-prism/query-helpers";

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
import { forEachQuery } from "@data-prism/query-helpers";

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
import { someQuery } from "@data-prism/query-helpers";

const hasComplexWhere = someQuery(
	schema,
	query,
	(subquery, info) => subquery.where && Object.keys(subquery.where).length > 2,
);
```

### Multi-API Functions

#### `collectQueryResults(schema, rootQuery, executor, initialContext?)`

Core query traversal engine with callback pattern - reusable across store types.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `rootQuery` (NormalQuery) - The normalized query to execute
- `executor` (Function) - Async function `(query, context) => Promise<any>`
- `initialContext` (Object, optional) - Initial context passed to executor

**Returns:** Promise resolving to nested result structure

```javascript
import { collectQueryResults } from "@data-prism/query-helpers";

const results = await collectQueryResults(
	schema,
	normalizedQuery,
	async (query, context) => {
		// Your custom query execution logic
		return await myAPI.fetch(query, context);
	},
	{ userId: "123", permissions: ["read"] },
);
```

#### `executeQueryWithAPIs(schema, rootQuery, apiRegistry, options?)`

Replaces the entire loadQueryData pattern - handles traversal, API coordination, and graph building.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `rootQuery` (NormalQuery) - The normalized query to execute
- `apiRegistry` (APIRegistry) - Maps resource types to API handlers
- `options` (QueryExecutionOptions, optional) - Context, caching, and special handlers

**Returns:** Promise<Graph> - Complete graph with all query results merged

```javascript
import { executeQueryWithAPIs } from "@data-prism/query-helpers";

const apiRegistry = {
	teams: {
		get: async (query, context) => {
			// Fetch teams data
			return await teamsAPI.query(query);
		},
	},
	matches: {
		get: async (query, context) => {
			// Fetch matches data
			return await matchesAPI.query(query);
		},
	},
};

const graph = await executeQueryWithAPIs(schema, normalizedQuery, apiRegistry, {
	context: { apiKey: "your-key" },
	specialHandlers: [
		{
			test: (query, context) => query.type === "teams" && query.where?.archived,
			handler: async (query, context) => {
				// Special handling for archived teams
				return await archivedTeamsAPI.query(query);
			},
		},
	],
});
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

### APIHandler

```typescript
interface APIHandler {
	get: (query: Query, context: Object) => Promise<any>;
	create?: (resource: Object, context: Object) => Promise<any>;
	update?: (resource: Object, context: Object) => Promise<any>;
	delete?: (resource: Object, context: Object) => Promise<any>;
}
```

### APIRegistry

```typescript
type APIRegistry = {
	[resourceType: string]: APIHandler;
};
```

### SpecialHandler

```typescript
interface SpecialHandler {
	test: (query: Query, context: Object) => boolean;
	handler: (query: Query, context: Object) => Promise<any>;
}
```

### QueryExecutionOptions

```typescript
interface QueryExecutionOptions {
	context?: Object; // Context passed to API handlers
	specialHandlers?: SpecialHandler[]; // Array of special case handlers
	withCache?: (
		key: string,
		fetcher: () => Promise<any>,
		options?: { ttl?: number },
	) => Promise<any>; // Caching function
}
```

## Examples

### Basic Query Traversal

```javascript
import { flattenQuery, forEachQuery } from "@data-prism/query-helpers";

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

### Multi-API Query Execution

```javascript
import { executeQueryWithAPIs } from "@data-prism/query-helpers";

// Define API handlers for different resource types
const apiRegistry = {
	teams: {
		get: async (query, context) => {
			const response = await fetch(`/api/teams?${buildQueryString(query)}`, {
				headers: { Authorization: `Bearer ${context.apiKey}` },
			});
			return response.json();
		},
	},
	matches: {
		get: async (query, context) => {
			const response = await fetch(`/api/matches?${buildQueryString(query)}`, {
				headers: { Authorization: `Bearer ${context.apiKey}` },
			});
			return response.json();
		},
	},
};

// Execute complex query spanning multiple APIs
const graph = await executeQueryWithAPIs(
	schema,
	{
		type: "teams",
		select: {
			name: "name",
			homeMatches: {
				select: ["field", "awayTeam"],
				where: { status: "completed" },
			},
		},
		where: { active: true },
	},
	apiRegistry,
	{
		context: { apiKey: "your-api-key" },
		specialHandlers: [
			{
				test: (query) => query.where?.archived === true,
				handler: async (query, context) => {
					// Use different endpoint for archived resources
					return await fetchArchivedData(query, context);
				},
			},
		],
	},
);

// Use the resulting graph with any Data Prism store
console.log(graph);
```

### Query Analysis

```javascript
import { someQuery, flatMapQuery } from "@data-prism/query-helpers";

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

Data Prism Query Helpers includes comprehensive TypeScript definitions:

```typescript
import type {
	QueryBreakdown,
	QueryBreakdownItem,
	APIHandler,
	APIRegistry,
	SpecialHandler,
	QueryExecutionOptions,
} from "@data-prism/query-helpers";

import type { Schema, RootQuery, Graph } from "@data-prism/core";

const apiRegistry: APIRegistry = {
	teams: {
		get: async (query, context) => {
			// Type-safe API handler implementation
			return await myTeamsAPI.query(query);
		},
	},
};
```

## Related Packages

- `@data-prism/core` - Core data structures and query execution
- `@data-prism/memory-store` - In-memory data store implementation
- `@data-prism/postgres-store` - PostgreSQL backend
- `@data-prism/jsonapi-store` - JSON:API client store
