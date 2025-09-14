# SpectraGraph Core

A JavaScript library for working with schema-driven graph data. SpectraGraph provides powerful tools for querying, validating, and manipulating relational data structures with a focus on type safety and developer experience. It is intended to be a toolkit for building SpectraGraph stores.

## Overview

SpectraGraph Core is built around several key principles:

- **Schema-driven**: Everything flows from user-defined schemas that describe your data structure
- **Query-focused**: Powerful query language for retrieving exactly the data you need
- **Practical**: Optimized for real-world messy data scenarios with schema powered validation

## Installation

```bash
npm install @spectragraph/core
```

## Core Concepts

### Schemas

Schemas define the structure of your data, including resource types, attributes, and relationships. They serve as the foundation for all SpectraGraph operations.

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
	select: ["name", { homeMatches: ["field", "ageGroup"] }],
};
```

### Expressions

SpectraGraph queries support expressions for computed fields and conditional logic. These expressions are provided by the [json-expressions](https://github.com/jakesower/json-expressions) library, which offers a comprehensive set of operators for data transformation and filtering.

#### Expression Engines

SpectraGraph uses focused expression engines to provide different capabilities for different query contexts:

- **SELECT Engine** (`defaultSelectEngine`): Full expression capabilities including filtering, aggregations, transformations, and computed fields
- **WHERE Engine** (`defaultWhereEngine`): Filtering-only operations for performance and security - excludes expensive aggregation operations

This architecture ensures that resource-intensive operations are only available where appropriate, preventing performance issues from expensive aggregations in WHERE clauses.

#### What are Expressions?

Expressions are JSON objects that describe computations to be performed on data. Each expression has a single key that identifies the operation (prefixed with `$`) and a value that provides the parameters:

Simple comparison:

```json
{ "$gt": 11 }
```

Logical expressions:

```json
{ "$and": [{ "$gte": 2020 }, { "$eq": "active" }] }
```

Conditional logic:

```json
{
	"$if": {
		"if": { "$eq": "Phoenix" },
		"then": { "$get": "name" },
		"else": "Away Team"
	}
}
```

#### Basic Expression Examples

Check if player is eligible for age group:

```json
{ "$gte": 11 }
```

Get team's home field:

```json
{ "$get": "homeField.name" }
```

Calculate total match cost:

```json
{ "$add": [150, 25] }
```

Sum all team scores:

```json
{ "$sum": [2, 1, 4, 0] }
```

Filter teams by city:

```json
{ "$filter": { "$eq": "Phoenix" } }
```

Get all team names:

```json
{ "$map": { "$get": "name" } }
```

Join team cities:

```json
{ "$join": " vs " }
```

#### Available Operations

The json-expressions library provides comprehensive operations including:

- **Core**: `$compose`, `$debug`, `$ensurePath`, `$get`, `$prop`, `$isDefined`, `$literal`, `$pipe`
- **Conditionals**: `$switch`, `$case`, `$if`
- **Logic**: `$and`, `$not`, `$or`
- **Comparisons**: `$eq`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$ne`
- **Pattern matching**: `$matchesRegex`, `$matchesLike`, `$matchesGlob`
- **Aggregation**: `$count`, `$max`, `$min`, `$mean`, `$median`, `$mode`, `$sum`
- **Array operations**: `$all`, `$any`, `$append`, `$filter`, `$find`, `$flatMap`, `$join`, `$map`, `$prepend`, `$reverse`
- **Math**: `$add`, `$subtract`, `$multiply`, `$divide`, `$modulo`
- **Generative**: `$random`, `$uuid`
- **Temporal**: `$nowLocal`, `$nowUTC`, `$timestamp`

For complete documentation of all available operations, see the [json-expressions documentation](https://github.com/jakesower/json-expressions).

#### Custom Expressions

Available expressions can be extended. Most stores accept `selectEngine` and `whereEngine` parameters. See the [json-expressions documentation](https://github.com/jakesower/json-expressions) for how to create and use custom expressions.

#### Using Expressions in Queries

Expressions can be used in both `where` clauses for filtering and `select` clauses for computed fields:

```javascript
// Query teams with expressions in where clause
const teamQuery = {
	type: "teams",
	where: {
		$and: [
			{ founded: { $gte: 2000 } }, // founded >= 2000
			{ founded: { $lte: 2020 } }, // founded <= 2020
			{ active: { $eq: true } }, // active === true
		],
	},
	select: {
		name: "name",
		city: "city",
		seasonsActive: { $subtract: [2024, { $get: "founded" }] }, // Computed field
		division: "division",
	},
};

// Complex conditional logic for match analysis
const matchQuery = {
	type: "matches",
	select: {
		field: "field",
		ageGroup: "ageGroup",
		status: {
			$case: {
				value: { $get: "ageGroup" },
				cases: [
					{ when: { $lt: 12 }, then: "Youth League" },
					{ when: { $lt: 16 }, then: "Junior League" },
					{ when: { $gte: 16 }, then: "Senior League" },
				],
				default: "Unassigned",
			},
		},
		isPlayoff: {
			$and: [
				{ $gte: 10 }, // week >= 10
				{ $eq: "important" }, // importance === "important"
			],
		},
	},
};
```

## API Reference

### Schema Functions

#### `ensureValidSchema(schema, options?)`

Validates that a schema conforms to the SpectraGraph schema specification.

**Parameters:**

- `schema` (unknown) - The schema to validate
- `options.validator` (Ajv, optional) - Custom AJV validator instance

**Throws:** Error if schema is invalid

```javascript
import { ensureValidSchema } from "@spectragraph/core";

ensureValidSchema(mySchema); // Throws if invalid
```

### Graph Functions

#### `createEmptyGraph(schema, options?)`

Creates an empty graph structure based on a schema.

**Parameters:**

- `schema` (Schema) - The schema to base the graph on
- `options.skipValidation` (boolean, optional) - Skip schema validation for performance

**Returns:** Empty graph with resource type placeholders

```javascript
import { createEmptyGraph } from "@spectragraph/core";

const emptyGraph = createEmptyGraph(schema);
// Returns: { teams: {}, matches: {} }

// Skip validation for performance
const emptyGraph = createEmptyGraph(schema, { skipValidation: true });
```

#### `linkInverses(schema, graph)`

Links inverse relationships in a graph, filling in missing relationship data where possible. Queries will not work without relationships going in the direction of the query, so it's important to use this if you're constructing a graph from semi-connected pieces. This is commonly used with `mergeGraphsDeep`.

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `graph` (Graph) - The graph to link inverses in

**Returns:** New graph with inverse relationships linked

```javascript
import { linkInverses } from "@spectragraph/core";

const linkedGraph = linkInverses(schema, graph);
```

#### `mergeGraphs(left, right)`

Merges two graphs together by combining resource collections. Right graph takes precedence for resources with conflicting IDs.

**Parameters:**

- `left` (Graph) - The left graph
- `right` (Graph) - The right graph (takes precedence for conflicts)

**Returns:** Merged graph with combined resource collections

```javascript
import { mergeGraphs } from "@spectragraph/core";

const combined = mergeGraphs(graph1, graph2);
```

#### `mergeGraphsDeep(left, right)`

Merges two graphs together, merging individual resources with matching IDs using `mergeResources()`.

**Parameters:**

- `left` (Graph) - The left graph
- `right` (Graph) - The right graph

**Returns:** Merged graph with resources intelligently merged

```javascript
import { mergeGraphsDeep } from "@spectragraph/core";

const combined = mergeGraphsDeep(graph1, graph2);
```

### Query Functions

#### `ensureValidQuery(schema, query, options?)`

Validates that a query is valid against a schema.

**Parameters:**

- `schema` (Schema) - The schema to validate against
- `query` (RootQuery) - The query to validate
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `options.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Throws:** Error if query is invalid

```javascript
import { ensureValidQuery } from "@spectragraph/core";

ensureValidQuery(schema, query); // Uses default engines
```

#### `normalizeQuery(schema, rootQuery, options?)`

Normalizes a query by expanding shorthand syntax and ensuring consistent structure.

**Parameters:**

- `schema` (Schema) - The schema object
- `rootQuery` (RootQuery) - The query to normalize
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `options.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Normalized query with expanded selections and consistent structure

```javascript
import { normalizeQuery } from "@spectragraph/core";

const normalized = normalizeQuery(schema, {
	type: "users",
	select: "*", // Expands to all attributes
});
```

#### `queryGraph(schema, query, graph, options?)`

Executes a query against a graph directly (convenience function).

**Parameters:**

- `schema` (Schema) - The schema defining relationships
- `query` (RootQuery) - The query to execute
- `graph` (Graph) - The graph to query
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `options.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Query results matching the query structure

```javascript
import { queryGraph } from "@spectragraph/core";

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

Converts a flat resource object into SpectraGraph's normalized format.

**Parameters:**

- `schema` (Schema) - The schema defining the resource structure
- `resourceType` (string) - The type of resource being normalized
- `resource` (object) - The flat resource data

**Returns:** Normalized resource with separated attributes and relationships

```javascript
import { normalizeResource } from "@spectragraph/core";

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
import { mergeResources } from "@spectragraph/core";

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

#### `createGraphFromResources(schema, rootResourceType, rootResources)`

Creates a complete graph from an array of resource objects, recursively processing nested relationships. **This function is particularly useful for handling nested resources.**

**Parameters:**

- `schema` (Schema) - The schema defining the resource structure
- `rootResourceType` (string) - The root resource type to process
- `rootResources` (Array) - Array of flat resource objects to convert

**Returns:** Complete graph with all discoverable resources from the input data

```javascript
import { createGraphFromResources } from "@spectragraph/core";

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

### Error Classes

SpectraGraph Core provides specialized error classes to help stores and applications handle unsupported functionality gracefully.

#### `ExpressionNotSupportedError`

Error thrown when a store does not support a particular expression. This allows stores to explicitly declare unsupported functionality and enables tests to handle these cases gracefully.

**Constructor Parameters:**

- `expression` (string) - The expression that is not supported (e.g., "$matchesRegex")
- `storeName` (string) - The name of the store that doesn't support the expression
- `reason` (string, optional) - Optional reason why the expression is not supported

**Properties:**

- `name` - "ExpressionNotSupportedError"
- `expression` - The unsupported expression name
- `storeName` - The store name
- `reason` - Optional reason (if provided)

```javascript
import { ExpressionNotSupportedError } from "@spectragraph/core";

// In a store implementation
if (!this.supportsRegex) {
	throw new ExpressionNotSupportedError(
		"$matchesRegex",
		"simple-store",
		"Regex operations require additional dependencies",
	);
}

// In application code
try {
	const results = await store.query(queryWithRegex);
} catch (error) {
	if (error instanceof ExpressionNotSupportedError) {
		console.log(
			`Expression ${error.expression} not supported by ${error.storeName}`,
		);
		// Handle gracefully, perhaps with a fallback query
	}
}
```

#### `StoreOperationNotSupportedError`

Error thrown when a store does not support a particular operation. This allows stores to explicitly declare unsupported functionality and enables tests to handle these cases gracefully. This is particularly useful for readonly stores or stores with limited write capabilities.

**Constructor Parameters:**

- `operation` (string) - The store operation that is not supported (e.g., "create", "update", "delete")
- `storeName` (string) - The name of the store that doesn't support the operation
- `reason` (string, optional) - Optional reason why the operation is not supported

**Properties:**

- `name` - "StoreOperationNotSupportedError"
- `operation` - The unsupported operation name
- `storeName` - The store name
- `reason` - Optional reason (if provided)

```javascript
import { StoreOperationNotSupportedError } from "@spectragraph/core";

// In a readonly store implementation
class ReadOnlyStore {
	create(resource) {
		throw new StoreOperationNotSupportedError(
			"create",
			"readonly-store",
			"This store only supports read operations",
		);
	}

	update(resource) {
		throw new StoreOperationNotSupportedError("update", "readonly-store");
	}

	delete(resource) {
		throw new StoreOperationNotSupportedError("delete", "readonly-store");
	}
}

// In application code
try {
	await store.create(newResource);
} catch (error) {
	if (error instanceof StoreOperationNotSupportedError) {
		console.log(
			`Operation ${error.operation} not supported by ${error.storeName}`,
		);
		// Handle gracefully, perhaps by using a different store or informing the user
	}
}
```

### Validation Functions

#### `validateSchema(schema, options?)`

Validates that a schema conforms to the SpectraGraph schema specification.

**Parameters:**

- `schema` (unknown) - The schema to validate
- `options.validator` (Ajv, optional) - Custom AJV validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateSchema } from "@spectragraph/core";

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
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `options.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateQuery } from "@spectragraph/core";

const errors = validateQuery(schema, query);
if (errors.length > 0) {
	console.error("Query validation failed:", errors);
}
```

#### `createValidator(options?)`

Creates a new AJV validator instance configured for SpectraGraph.

**Parameters:**

- `options.ajvSchemas` (Array, optional) - Additional schemas to add

**Returns:** Configured AJV validator

```javascript
import { createValidator } from "@spectragraph/core";

const validator = createValidator({
	ajvSchemas: [myCustomSchema],
});
```

#### `defaultValidator`

The default AJV validator instance used by SpectraGraph.

```javascript
import { defaultValidator } from "@spectragraph/core";

// Use the default validator directly
const isValid = defaultValidator.validate(schema, data);
```

#### `defaultSelectEngine`

The default expression engine for SELECT clauses, providing full expression capabilities including filtering, aggregations, transformations, and computed fields.

```javascript
import { defaultSelectEngine } from "@spectragraph/core";

// Use in custom query normalization
const normalizedQuery = normalizeQuery(schema, query, {
	selectEngine: defaultSelectEngine,
});
```

#### `defaultWhereEngine`

The default expression engine for WHERE clauses, providing filtering-only operations for performance and security. Excludes expensive aggregation operations.

```javascript
import { defaultWhereEngine } from "@spectragraph/core";

// Use in custom query validation
const errors = validateQuery(schema, query, {
	whereEngine: defaultWhereEngine,
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
import { validateCreateResource } from "@spectragraph/core";

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
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `options.validator` (Ajv, optional) - Custom validator instance

**Returns:** Array of validation errors (empty if valid)

```javascript
import { validateQueryResult } from "@spectragraph/core";

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
import { ensureValidCreateResource } from "@spectragraph/core";

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
- `options.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
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
} from "@spectragraph/core";

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
import {
	validateCreateResource,
	ensureValidCreateResource,
} from "@spectragraph/core";

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

SpectraGraph Core includes comprehensive TypeScript definitions. Import types as needed:

```typescript
import type {
	Schema,
	Graph,
	Query,
	RootQuery,
	NormalResource,
} from "@spectragraph/core";

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
import {
	createValidator,
	validateSchema,
	ensureValidSchema,
} from "@spectragraph/core";

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

- `@spectragraph/memory-store` - In-memory data store implementation
- `@spectragraph/postgres-store` - PostgreSQL backend
- `@spectragraph/jsonapi-store` - JSON:API client store
