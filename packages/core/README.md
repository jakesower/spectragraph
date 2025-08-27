# Data Prism Core

A JavaScript library for working with schema-driven graph data. Data Prism provides powerful tools for querying, validating, and manipulating relational data structures with a focus on type safety and developer experience. It is intended to be a toolkit for building Data Prism stores.

## Overview

Data Prism Core is built around several key principles:

- **Schema-driven**: Everything flows from user-defined schemas that describe your data structure
- **Query-focused**: Powerful query language for retrieving exactly the data you need
- **Practical**: Optimized for real-world messy data scenarios with schema powered validation

## Installation

```bash
npm install @data-prism/core
```

## Core Concepts

### Schemas

Schemas define the structure of your data, including resource types, attributes, and relationships. They serve as the foundation for all Data Prism operations.

```javascript
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
				awayMatches: {
					type: "matches",
					cardinality: "many",
					inverse: "awayTeam",
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
				awayTeam: { type: "teams", cardinality: "one", inverse: "awayMatches" },
			},
		},
	},
};
```

### Graphs

Graphs represent your actual data in a normalized structure, organized by resource type and ID:

```javascript
const graph = {
	teams: {
		"team-1": {
			type: "teams",
			id: "team-1",
			attributes: { name: "Arizona Bay FC", city: "Phoenix" },
			relationships: {
				homeMatches: [{ type: "matches", id: "match-1" }],
				awayMatches: [{ type: "matches", id: "match-2" }],
			},
		},
		"team-2": {
			type: "teams",
			id: "team-2",
			attributes: { name: "Scottsdale Surf", city: "Scottsdale" },
			relationships: {
				homeMatches: [{ type: "matches", id: "match-2" }],
				awayMatches: [{ type: "matches", id: "match-1" }],
			},
		},
	},
	matches: {
		"match-1": {
			type: "matches",
			id: "match-1",
			attributes: { field: "Phoenix Park 1", ageGroup: 11 },
			relationships: {
				homeTeam: { type: "teams", id: "team-1" },
				awayTeam: { type: "teams", id: "team-2" },
			},
		},
		"match-2": {
			type: "matches",
			id: "match-2",
			attributes: { field: "Scottsdale Community Center", ageGroup: 11 },
			relationships: {
				homeTeam: { type: "teams", id: "team-2" },
				awayTeam: { type: "teams", id: "team-1" },
			},
		},
	},
};
```

### Queries

Queries describe what data you want to retrieve, closely matching your desired output structure:

```javascript
const query = {
	type: "teams",
	select: {
		name: "name",
		homeMatches: {
			select: ["field", "ageGroup"],
		},
	},
};
```

### Expressions

Expressions are JSON objects that add computed fields and conditional logic to Data Prism queries. They provide a powerful way to transform, filter, and manipulate data using a declarative syntax:

```javascript
// Basic comparisons and logic
const query = {
	type: "teams",
	where: {
		$and: [
			{ founded: { $gte: 2000 } },  // Teams founded after 2000
			{ city: { $matchesRegex: "(?i)phoenix|tempe" } }, // Case-insensitive city matching
		]
	},
	select: {
		name: "name",
		isNewTeam: { $if: {
			if: { $gte: 2020 },
			then: true,
			else: false
		}},
		ageCategory: { $case: {
			value: { $get: "founded" },
			cases: [
				{ when: { $gte: 2020 }, then: "New" },
				{ when: { $gte: 2010 }, then: "Recent" },
				{ when: { $gte: 2000 }, then: "Established" }
			],
			default: "Legacy"
		}}
	}
};
```

Expressions support a wide range of operations including:
- **Comparisons**: `$eq`, `$gt`, `$lt`, `$in`, `$matchesRegex`, etc.
- **Logic**: `$and`, `$or`, `$not`
- **Conditionals**: `$if`, `$case`
- **Math**: `$add`, `$subtract`, `$multiply`, `$divide`
- **Aggregation**: `$sum`, `$count`, `$max`, `$min`, `$mean`, `$median`
- **Array operations**: `$filter`, `$map`, `$find`, `$any`, `$all`
- **Data access**: `$get`, `$pipe`, `$compose`

For comprehensive documentation on all available expressions, examples, and advanced usage patterns, see the **[Expressions README](src/expressions/README.md)**.

## API Reference

### Schema Functions

#### `ensureValidSchema(schema, options?)`

Validates that a schema conforms to the Data Prism schema specification.

**Parameters:**

- `schema` (unknown) - The schema to validate
- `options.validator` (Ajv, optional) - Custom AJV validator instance

**Throws:** Error if schema is invalid

```javascript
import { ensureValidSchema } from "@data-prism/core";

ensureValidSchema(mySchema); // Throws if invalid
```

### Graph Functions

#### `createEmptyGraph(schema)`

Creates an empty graph structure based on a schema.

**Parameters:**

- `schema` (Schema) - The schema to base the graph on

**Returns:** Empty graph with resource type placeholders

```javascript
import { createEmptyGraph } from "@data-prism/core";

const emptyGraph = createEmptyGraph(schema);
// Returns: { teams: {}, matches: {} }
```

#### `linkInverses(schema, graph)`

Links inverse relationships in a graph, filling in missing relationship data where possible. Queries will not work without relationships going in the direction of the query, so it's important to use this if you're constructing a graph from semi-connected pieces. This is commonly used with `mergeGraphsDeep`.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `graph` (Graph) - The graph to link inverses in

**Returns:** New graph with inverse relationships linked

```javascript
import { linkInverses } from "@data-prism/core";

const linkedGraph = linkInverses(schema, graph);
```

#### `mergeGraphs(left, right)`

Merges two graphs together by combining resource collections. Right graph takes precedence for resources with conflicting IDs.

**Parameters:**

- `left` (Graph) - The left graph
- `right` (Graph) - The right graph (takes precedence for conflicts)

**Returns:** Merged graph with combined resource collections

```javascript
import { mergeGraphs } from "@data-prism/core";

const combined = mergeGraphs(graph1, graph2);
```

#### `mergeGraphsDeep(left, right)`

Merges two graphs together, merging individual resources with matching IDs using `mergeResources()`.

**Parameters:**

- `left` (Graph) - The left graph
- `right` (Graph) - The right graph

**Returns:** Merged graph with resources intelligently merged

```javascript
import { mergeGraphsDeep } from "@data-prism/core";

const combined = mergeGraphsDeep(graph1, graph2);
```

### Query Functions

#### `ensureValidQuery(schema, query, options?)`

Validates that a query is valid against a schema.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `query` (RootQuery) - The query to validate
- `options.expressionEngine` (object, optional) - Custom expression engine

**Throws:** Error if query is invalid

```javascript
import { ensureValidQuery } from "@data-prism/core";

ensureValidQuery(schema, query); // Throws if invalid
```

#### `normalizeQuery(schema, rootQuery)`

Normalizes a query by expanding shorthand syntax and ensuring consistent structure.

**Parameters:**

- `schema` (Schema) - The schema object
- `rootQuery` (RootQuery) - The query to normalize

**Returns:** Normalized query with expanded selections and consistent structure

```javascript
import { normalizeQuery } from "@data-prism/core";

const normalized = normalizeQuery(schema, {
	type: "users",
	select: "*", // Expands to all attributes
});
```

#### `queryGraph(schema, query, graph)`

Executes a query against a graph directly (convenience function).

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `query` (RootQuery) - The query to execute
- `graph` (Graph) - The graph to query

**Returns:** Query results matching the query structure

```javascript
import { queryGraph } from "@data-prism/core";

const results = queryGraph(
	schema,
	{
		type: "teams",
		id: "team-1",
		select: {
			name: "name",
			homeMatches: { select: ["field"] },
		},
	},
	graph,
);
```

### Resource Functions

#### `normalizeResource(schema, resourceType, resource)`

Converts a flat resource object into Data Prism's normalized format.

**Parameters:**

- `schema` (Schema) - The schema defining the resource structure
- `resourceType` (string) - The type of resource being normalized
- `resource` (object) - The flat resource data

**Returns:** Normalized resource with separated attributes and relationships

```javascript
import { normalizeResource } from "@data-prism/core";

const flatTeam = {
	id: "team-1",
	name: "Tempe Tidal Wave",
	city: "Tempe",
	homeMatches: ["match-1", "match-3"], // IDs or objects
	awayMatches: ["match-2", "match-4"],
};

const normalized = normalizeResource(schema, "teams", flatTeam);
// Returns normalized resource with attributes and relationships separated
```

#### `mergeResources(left, right)`

Merges two partial resources of the same type, combining their attributes and relationships. The right resource takes precedence for conflicting attribute keys.

**Parameters:**

- `left` (PartialNormalResource) - The first resource to merge
- `right` (PartialNormalResource) - The second resource to merge

**Returns:** Merged PartialNormalResource with combined attributes and relationships

**Throws:** Error if resources are of different types or have conflicting IDs

```javascript
import { mergeResources } from "@data-prism/core";

const existing = {
	type: "teams",
	id: "team-1",
	attributes: { name: "Old Name", founded: 2000 },
	relationships: { homeField: { type: "fields", id: "field-1" } },
};

const update = {
	type: "teams",
	id: "team-1",
	attributes: { name: "New Name", active: true }, // name will override
};

const merged = mergeResources(existing, update);
// Returns:
// {
//   type: "teams",
//   id: "team-1", 
//   attributes: { name: "New Name", founded: 2000, active: true },
//   relationships: { homeField: { type: "fields", id: "field-1" } }
// }
```

#### `createGraphFromResources(schema, resourceType, resources)`

Creates a complete graph from an array of resource objects, recursively processing nested relationships. **This function is particularly useful for handling nested resources.**

**Parameters:**

- `schema` (Schema) - The schema defining the resource structure
- `resourceType` (string) - The root resource type to process
- `resources` (Array) - Array of flat resource objects to convert

**Returns:** Complete graph with all discoverable resources from the input data

```javascript
import { createGraphFromResources } from "@data-prism/core";

const flatTeam = {
	id: "team-1",
	name: "Arizona Bay FC",
	city: "Phoenix",
	homeMatches: [
		{
			id: "match-1",
			field: "Phoenix Park 1",
			ageGroup: 11,
			awayTeam: "team-2",
		},
	],
};

const graph = createGraphFromResources(schema, "teams", [flatTeam]);
// Returns a graph containing teams and matches resources
// with proper normalization and relationship structure
```

### Validation Functions

#### `validateSchema(schema, options?)`

Validates that a schema conforms to the Data Prism schema specification.

**Parameters:**

- `schema` (unknown) - The schema to validate
- `options.validator` (Ajv, optional) - Custom AJV validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateSchema } from "@data-prism/core";

const errors = validateSchema(mySchema);
if (errors.length > 0) {
	console.error("Schema validation failed:", errors);
}
```

#### `validateQuery(schema, query, options?)`

Validates that a query is valid against a schema.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `query` (RootQuery) - The query to validate
- `options.expressionEngine` (object, optional) - Custom expression engine
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateQuery } from "@data-prism/core";

const errors = validateQuery(schema, query);
if (errors.length > 0) {
	console.error("Query validation failed:", errors);
}
```

#### `createValidator(options?)`

Creates a new AJV validator instance configured for Data Prism.

**Parameters:**

- `options.ajvSchemas` (Array, optional) - Additional schemas to add

**Returns:** Configured AJV validator

```javascript
import { createValidator } from "@data-prism/core";

const validator = createValidator({
	ajvSchemas: [myCustomSchema],
});
```

#### `validateCreateResource(schema, resource, options?)`

Validates a resource for creation operations.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (CreateResource) - The resource to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateCreateResource } from "@data-prism/core";

const errors = validateCreateResource(schema, {
	type: "teams",
	attributes: { name: "Scottsdale Surf", city: "Scottsdale" },
});
```

#### `validateUpdateResource(schema, resource, options?)`

Validates a resource for update operations.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (UpdateResource) - The resource to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

#### `validateDeleteResource(schema, resource)`

Validates a resource for delete operations.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (DeleteResource) - The resource reference to validate

**Returns:** Array of validation errors (empty if valid)

#### `validateMergeResource(schema, resource, options?)`

Validates a resource tree that will be merged into a graph.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (unknown) - The resource tree to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

#### `validateQueryResult(schema, rootQuery, result, options?)`

Validates that query results match the expected structure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `rootQuery` (RootQuery) - The original query
- `result` (unknown) - The query results to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateQueryResult } from "@data-prism/core";

const errors = validateQueryResult(schema, query, results);
if (errors.length > 0) {
	console.error("Query result validation failed:", errors);
}
```

### Ensure Functions

The following functions provide throwing variants of the validation functions above, useful for fail-fast scenarios:

#### `ensureValidCreateResource(schema, resource, options?)`

Validates a resource for creation operations. Throws on validation failure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (CreateResource) - The resource to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Throws:** Error if resource is invalid

```javascript
import { ensureValidCreateResource } from "@data-prism/core";

ensureValidCreateResource(schema, newResource); // Throws if invalid
```

#### `ensureValidUpdateResource(schema, resource, options?)`

Validates a resource for update operations. Throws on validation failure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (UpdateResource) - The resource to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Throws:** Error if resource is invalid

#### `ensureValidDeleteResource(schema, resource)`

Validates a resource for delete operations. Throws on validation failure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (DeleteResource) - The resource reference to validate

**Throws:** Error if resource is invalid

#### `ensureValidMergeResource(schema, resource, options?)`

Validates a resource tree that will be merged into a graph. Throws on validation failure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `resource` (unknown) - The resource tree to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Throws:** Error if resource is invalid

#### `ensureValidQueryResult(schema, rootQuery, result, options?)`

Validates that query results match the expected structure. Throws on validation failure.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `rootQuery` (RootQuery) - The original query
- `result` (unknown) - The query results to validate
- `options.validator` (Ajv, optional) - Custom validator instance

**Throws:** Error if results don't match expected structure

## Examples

### Basic Usage

```javascript
import {
	ensureValidSchema,
	createEmptyGraph,
	queryGraph,
	normalizeResource,
} from "@data-prism/core";

// 1. Define your schema
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
				awayMatches: {
					type: "matches",
					cardinality: "many",
					inverse: "awayTeam",
				},
			},
		},
	},
};

// 2. Validate the schema
ensureValidSchema(schema);

// 3. Create and populate a graph
const graph = createEmptyGraph(schema);
const teamData = { id: "1", name: "Arizona Bay FC" };
const normalizedTeam = normalizeResource(schema, "teams", teamData);

graph.teams["1"] = normalizedTeam;

// 4. Query the data
const results = queryGraph(
	schema,
	{
		type: "teams",
		select: ["name"],
	},
	graph,
);

console.log(results); // [{ name: "Arizona Bay FC" }]
```

### Working with Relationships

```javascript
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
				awayMatches: {
					type: "matches",
					cardinality: "many",
					inverse: "awayTeam",
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
				awayTeam: { type: "teams", cardinality: "one", inverse: "awayMatches" },
			},
		},
	},
};

// Query with relationship traversal
const results = queryGraph(
	schema,
	{
		type: "teams",
		select: {
			name: "name",
			homeMatches: {
				select: ["field", "awayTeam"],
			},
		},
	},
	graph,
);
```

### Data Validation

```javascript
import { validateCreateResource, ensureValidCreateResource } from "@data-prism/core";

const newTeam = {
	type: "teams",
	attributes: {
		name: "Mesa Mariners",
		city: "Mesa",
	},
};

// Option 1: Check errors manually
const errors = validateCreateResource(schema, newTeam);
if (errors.length > 0) {
	console.error("Validation failed:", errors);
}

// Option 2: Throw on validation failure
try {
	ensureValidCreateResource(schema, newTeam);
	console.log("Resource is valid!");
} catch (error) {
	console.error("Validation failed:", error.message);
}
```

## TypeScript Support

Data Prism Core includes comprehensive TypeScript definitions. Import types as needed:

```typescript
import type {
	Schema,
	Graph,
	Query,
	RootQuery,
	NormalResource,
} from "@data-prism/core";

const schema: Schema = {
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
				awayMatches: {
					type: "matches",
					cardinality: "many",
					inverse: "awayTeam",
				},
			},
		},
	},
};
```

## Advanced Usage

### Custom Validation

```javascript
import { createValidator, validateSchema, ensureValidSchema } from "@data-prism/core";

const customValidator = createValidator({
	ajvSchemas: [myCustomSchema],
});

// Option 1: Check errors manually
const errors = validateSchema(schema, { validator: customValidator });
if (errors.length > 0) {
	console.error("Schema validation failed:", errors);
}

// Option 2: Throw on validation failure
ensureValidSchema(schema, { validator: customValidator });
```

### Performance Optimization

For better performance with large datasets:

1. Link inverses once with `linkInverses` rather than on each query
2. Validate schemas once during application startup

## Related Packages

- `@data-prism/memory-store` - In-memory data store implementation
- `@data-prism/postgres-store` - PostgreSQL backend
- `@data-prism/jsonapi-store` - JSON:API client store
