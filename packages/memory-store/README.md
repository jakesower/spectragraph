# Data Prism Memory Store

A reference implementation and development utility for Data Prism that provides CRUD operations, querying, and relationship management for graph data stored entirely in memory.

## Primary Use Cases

**1. Reference Implementation**
Memory Store serves as the canonical example of how to implement the Data Prism Store interface correctly. If you're building your own store (database adapter, API client, etc.), use this implementation as your guide for proper schema validation, relationship management, and query handling.

**2. Development Stepping Stone**
Memory Store provides a seamless transition path from development to production. Mock out your data model with JSON fixtures, develop and test your application logic, then swap to a production store when your real backend is ready - with zero code changes to your application layer.

**Additional Benefits:**
- **Testing**: Fast, deterministic test fixtures that reset cleanly between tests
- **Prototyping**: Quick demos and MVPs without external dependencies
- **Local Development**: Work offline with realistic relational data

## Overview

Data Prism Memory Store is built around several key principles:

- **Schema-driven**: Validates all operations against your Data Prism schema
- **Relationship-aware**: Automatically maintains bidirectional relationships
- **Query-compatible**: Full support for Data Prism's query language
- **Memory-efficient**: Normalized storage with reference-based relationships

## Installation

```bash
npm install @data-prism/memory-store
```

## Core Concepts

### Memory Store

The memory store maintains your data in normalized form in memory, with automatic relationship management and validation. All data is stored in a graph structure organized by resource type and ID.

```javascript
import { createMemoryStore } from "@data-prism/memory-store";
import { defaultSelectEngine, defaultWhereEngine } from "@data-prism/core";

const store = createMemoryStore(schema, {
	initialData: existingGraph, // optional
	validator: customValidator, // optional
	selectEngine: defaultSelectEngine, // optional - expression engine for SELECT clauses
	whereEngine: defaultWhereEngine, // optional - expression engine for WHERE clauses
});
```

### Operations

The memory store provides standard CRUD operations plus advanced features:

- **create** - Add new resources with automatic ID generation
- **update** - Modify existing resources with attribute merging
- **upsert** - Create or update based on resource existence
- **delete** - Remove resources with relationship cleanup
- **query** - Execute Data Prism queries against the store
- **merge** - Insert complex resource trees with nested relationships

### Expression Engines

The memory store uses focused expression engines from Data Prism Core to provide different capabilities for different query contexts:

- **SELECT Engine**: Full expression capabilities including filtering, aggregations, transformations, and computed fields for SELECT clauses
- **WHERE Engine**: Filtering-only operations for WHERE clauses, excluding expensive aggregation operations for performance and security

By default, the memory store uses `defaultSelectEngine` and `defaultWhereEngine` from `@data-prism/core`. You can provide custom engines in the configuration if needed for specialized use cases.

## API Reference

### `createMemoryStore(schema, config?)`

Creates a new in-memory store instance.

**Parameters:**

- `schema` (Schema) - The Data Prism schema defining resource types and relationships
- `config.initialData` (Graph, optional) - Initial graph data to populate the store
- `config.validator` (Ajv, optional) - Custom AJV validator instance
- `config.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `config.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Memory store instance with CRUD and query operations

```javascript
import { createMemoryStore } from "@data-prism/memory-store";

const store = createMemoryStore(schema, {
	initialData: {
		teams: {
			"team-1": {
				type: "teams",
				id: "team-1",
				attributes: { name: "Arizona Bay FC" },
				relationships: { homeMatches: [] },
			},
		},
	},
});
```

### Store Operations

#### `store.create(resource)`

Creates a new resource in the store with automatic relationship linking.

**Parameters:**

- `resource` (CreateResource) - The resource to create

**Returns:** The created normalized resource

```javascript
const newTeam = store.create({
	type: "teams",
	attributes: {
		name: "Scottsdale Surf",
		city: "Scottsdale",
	},
	relationships: {
		homeField: { type: "fields", id: "field-1" },
	},
});
```

#### `store.update(resource)`

Updates an existing resource, merging attributes and relationships.

**Parameters:**

- `resource` (UpdateResource) - The resource updates to apply

**Returns:** The updated normalized resource

```javascript
const updatedTeam = store.update({
	type: "teams",
	id: "team-1",
	attributes: {
		city: "Phoenix", // New attribute
	},
	relationships: {
		homeMatches: [{ type: "matches", id: "match-1" }], // Replace relationship
	},
});
```

#### `store.upsert(resource)`

Creates a resource if it doesn't exist, otherwise updates it.

**Parameters:**

- `resource` (CreateResource | UpdateResource) - The resource to upsert

**Returns:** The created or updated normalized resource

```javascript
// Creates if team-2 doesn't exist, updates if it does
const team = store.upsert({
	type: "teams",
	id: "team-2",
	attributes: { name: "Mesa Mariners" },
});
```

#### `store.delete(resource)`

Deletes a resource and cleans up all inverse relationships.

**Parameters:**

- `resource` (DeleteResource) - The resource reference to delete

**Returns:** The deleted resource reference

```javascript
store.delete({ type: "teams", id: "team-1" });
// All references to team-1 are automatically removed from related resources
```

#### `store.query(query)`

Executes a Data Prism query against the store.

**Parameters:**

- `query` (RootQuery) - The query to execute

**Returns:** Query results matching the query structure

```javascript
const results = store.query({
	type: "teams",
	select: {
		name: "name",
		homeMatches: {
			select: ["field", "ageGroup"],
			where: { ageGroup: { $gt: 10 } },
		},
	},
	where: { city: "Phoenix" },
});
```

#### `store.getOne(type, id)`

Retrieves a single resource by type and ID.

**Parameters:**

- `type` (string) - The resource type
- `id` (string) - The resource ID

**Returns:** The normalized resource or null if not found

```javascript
const team = store.getOne("teams", "team-1");
// Returns: { type: "teams", id: "team-1", attributes: {...}, relationships: {...} }
```

#### `store.merge(resourceTree)`

Inserts a complex resource tree with nested relationships into the store.

**Parameters:**

- `resourceTree` (NormalResourceTree) - The resource tree to merge

**Returns:** The processed resource tree with all nested resources created/updated

```javascript
const result = store.merge({
	type: "teams",
	attributes: { name: "Tempe Tidal Wave" },
	relationships: {
		homeMatches: [
			{
				// Nested resource - will be created automatically
				type: "matches",
				attributes: { field: "Tempe Community Center", ageGroup: 12 },
				relationships: {
					awayTeam: { type: "teams", id: "team-2" }, // Reference to existing
				},
			},
		],
	},
});
```

### Advanced Operations

#### `store.linkInverses()`

Manually triggers inverse relationship linking across the entire store.

```javascript
store.linkInverses();
// Ensures all bidirectional relationships are properly connected
```

## Examples

### Basic Usage

```javascript
import { createMemoryStore } from "@data-prism/memory-store";

// 1. Define your schema (or import from elsewhere)
const schema = {
	resources: {
		teams: {
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
				city: { type: "string" },
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
				ageGroup: { type: "integer" },
			},
			relationships: {
				homeTeam: { type: "teams", cardinality: "one", inverse: "homeMatches" },
			},
		},
	},
};

// 2. Create the store
const store = createMemoryStore(schema);

// 3. Create resources
const team = store.create({
	type: "teams",
	attributes: {
		name: "Arizona Bay FC",
		city: "Phoenix",
	},
});

const match = store.create({
	type: "matches",
	attributes: {
		field: "Phoenix Park 1",
		ageGroup: 11,
	},
	relationships: {
		homeTeam: { type: "teams", id: team.id },
	},
});

// 4. Query the data
const results = store.query({
	type: "teams",
	select: {
		name: "name",
		homeMatches: {
			select: ["field", "ageGroup"],
		},
	},
});

console.log(results);
// [{ name: "Arizona Bay FC", homeMatches: [{ field: "Phoenix Park 1", ageGroup: 11 }] }]
```

### Complex Resource Trees

```javascript
// Create a team with nested matches and relationships
const teamWithMatches = store.merge({
	type: "teams",
	attributes: {
		name: "Scottsdale Surf",
		city: "Scottsdale",
	},
	relationships: {
		homeMatches: [
			{
				type: "matches",
				attributes: {
					field: "Scottsdale Community Center",
					ageGroup: 12,
				},
				relationships: {
					awayTeam: { type: "teams", id: team.id }, // Reference to existing team
				},
			},
			{
				type: "matches",
				attributes: {
					field: "Desert Breeze Park",
					ageGroup: 14,
				},
			},
		],
	},
});

// All relationships are automatically linked bidirectionally
const phoenixTeam = store.getOne("teams", team.id);
console.log(phoenixTeam.relationships.awayMatches.length); // 1
```

### Data Validation

```javascript
// Validation happens automatically on all operations
try {
	store.create({
		type: "teams",
		attributes: {
			name: 123, // Invalid: should be string
		},
	});
} catch (error) {
	console.error("Validation failed:", error.message);
}

// Custom validator for additional constraints
import { createValidator } from "@data-prism/core";

const customValidator = createValidator({
	ajvSchemas: [myCustomSchema],
});

const strictStore = createMemoryStore(schema, {
	validator: customValidator,
});
```

### Querying with Filters

```javascript
// Find all matches for teams from Phoenix
const phoenixMatches = store.query({
	type: "matches",
	select: {
		field: "field",
		ageGroup: "ageGroup",
		homeTeamName: "homeTeam.name",
	},
	where: {
		"homeTeam.city": "Phoenix",
		ageGroup: { $gte: 11 },
	},
	order: [{ ageGroup: "asc" }, { field: "asc" }],
	limit: 10,
});
```

## TypeScript Support

Data Prism Memory Store includes comprehensive TypeScript definitions:

```typescript
import type { MemoryStore, MemoryStoreConfig } from "@data-prism/memory-store";
import type { Schema, CreateResource } from "@data-prism/core";

const schema: Schema = {
	resources: {
		teams: {
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
			},
			relationships: {},
		},
	},
};

const store: MemoryStore = createMemoryStore(schema);

const newTeam: CreateResource = {
	type: "teams",
	attributes: { name: "Mesa Mariners" },
};
```

## Production Considerations

**Memory Store is designed for development, not production use.** Key limitations:

- **Memory growth**: No cleanup mechanisms - data accumulates indefinitely
- **Single-process only**: All data is lost when the process restarts
- **No persistence**: Changes are not saved to disk
- **Performance**: O(n) queries without indexing, suitable for small development datasets

For production applications, transition to a persistent store like `@data-prism/postgres-store` or implement your own store using this as a reference.

## Related Packages

- `@data-prism/core` - Core Data Prism functionality and validation
- `@data-prism/postgres-store` - PostgreSQL backend store
- `@data-prism/jsonapi-store` - JSON:API client store
