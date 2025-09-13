# SpectraGraph Multi-API Store

A SpectraGraph store implementation that aggregates data from multiple API endpoints into a unified interface. Supports both read and write operations (when configured with appropriate API handlers), making it perfect for querying and managing data across REST APIs, microservices, or third-party data sources.

## Overview

SpectraGraph Multi-API Store is built around several key principles:

- **Schema-driven**: Validates all operations against your SpectraGraph schema
- **API-agnostic**: Works with any API that returns JSON data
- **Full CRUD support**: Supports create, read, update, and delete operations when configured
- **Query-compatible**: Full support for SpectraGraph's query language
- **Special handlers**: Supports custom logic for complex data loading scenarios
- **Built-in caching**: Optional caching with TTL support for improved performance

## Installation

```bash
npm install @spectragraph/multi-api-store
```

## Core Concepts

### Multi-API Store

The multi-API store acts as a read-only aggregation layer over multiple API endpoints. Each resource type in your schema can be configured with a getter function that fetches data from the appropriate API endpoint.

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";
import { defaultSelectEngine, defaultWhereEngine } from "@spectragraph/core";

const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async (options) => {
				const response = await fetch("/api/skeptics");
				return response.json();
			},
		},
		investigations: {
			get: async (options) => {
				const response = await fetch("/api/investigations");
				return response.json();
			},
		},
	},
	selectEngine: defaultSelectEngine, // optional
	whereEngine: defaultWhereEngine, // optional
});
```

### Operations

The multi-API store provides comprehensive data operations:

- **query** - Execute SpectraGraph queries against the aggregated APIs
- **create** - Create new resources using configured API handlers
- **update** - Update existing resources using configured API handlers  
- **delete** - Delete resources using configured API handlers
- **upsert/merge** - Not supported (throws `StoreOperationNotSupportedError`)

Write operations (create, update, delete) are only available when the corresponding API handlers are configured for each resource type. If a handler is not provided, the operation will throw a `StoreOperationNotSupportedError`.

### Special Handlers

Special handlers allow you to customize data loading logic for complex scenarios where resources are loaded together or require conditional logic. This is particularly useful when:

- One API call returns data for multiple resource types
- You need to avoid redundant API calls when data is already loaded
- Different contexts require different data loading strategies

```javascript
const specialHandlers = [
	{
		test: (query, context) =>
			query.type === "investigations" &&
			context.parentQuery?.type === "skeptics",
		handler: async (query, context) => {
			// Load investigations differently when queried from skeptics
			const skepticId = context.parentQuery.id;
			const response = await fetch(`/api/skeptics/${skepticId}/investigations`);
			return response.json();
		},
	},
	{
		test: (query) => query.type === "weirdBeliefs",
		handler: (query, context) =>
			// If we're loading beliefs that are already embedded in investigations data
			context.parentQuery?.type === "investigations"
				? []
				: DEFAULT_APIS.weirdBeliefs.get(query, context),
	},
];
```

### Caching

The multi-API store includes optional caching to improve performance by reducing redundant API calls:

```javascript
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async () => {
				const response = await fetch('https://api1.example.com/skeptics');
				return response.json();
			}
		}
	},
	cache: {
		enabled: true,
		defaultTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
		keyGenerator: (query, context) => {
			// Custom cache key generation
			return `${query.type}-${JSON.stringify(query.select)}-${context.parentQuery?.type || 'root'}`;
		}
	}
});
```

**Cache Configuration Options:**
- `enabled` (boolean, default: false) - Enable or disable caching
- `defaultTTL` (number, default: 5 minutes) - Time-to-live for cached entries in milliseconds
- `keyGenerator` (function, optional) - Custom function to generate cache keys

**Cache Behavior:**
- Query results are cached based on the query structure and context
- Cache is automatically cleared for a resource type when create/update/delete operations are performed
- Expired cache entries are automatically removed on access
- Cache keys include parent query context to handle relationship-specific caching

### Middleware

The multi-API store supports middleware to enhance request processing with cross-cutting concerns like authentication, logging, and retry logic. Middleware functions are executed in order before resource handlers are called.

```javascript
import { auth, retry, log } from "@spectragraph/multi-api-store";

const store = createMultiApiStore(schema, {
	middleware: [
		// Add authentication headers
		auth.bearerToken(() => getAuthToken()),
		
		// Retry on server errors with exponential backoff
		retry.exponential({
			maxRetries: 3,
			timeout: 30000,
		}),
		
		// Log all requests and responses
		log.requests({
			logger: console,
			includeTiming: true,
		}),
	],
	resources: {
		// Resource configuration...
	},
});
```

**Built-in Middleware:**

**Authentication (`auth`)**
- `auth.bearerToken(getToken)` - Adds Bearer token to Authorization header
- `auth.queryParam(getToken, paramName)` - Adds token as query parameter

**Retry (`retry`)**  
- `retry.exponential(config)` - Retries failed requests with exponential backoff
  - Only retries 5xx server errors (not 4xx client errors)
  - Configurable `maxRetries`, `timeout`, and `backoffFn`

**Logging (`log`)**
- `log.requests(config)` - Logs request/response details
  - Configurable `logger`, `includeTiming` options

**Custom Middleware:**

Middleware functions receive `(context, next)` parameters:
- `context` - Request context including query, config, and request metadata
- `next` - Function to call the next middleware or handler

```javascript
const customAuth = (context, next) => {
	return next({
		...context,
		request: {
			...context.request,
			headers: {
				...context.request.headers,
				'X-API-Key': process.env.API_KEY,
			},
		},
	});
};
```

### Expression Engines

The multi-API store uses focused expression engines from SpectraGraph Core to provide different capabilities for different query contexts:

- **SELECT Engine**: Full expression capabilities including filtering, aggregations, transformations, and computed fields for SELECT clauses
- **WHERE Engine**: Filtering-only operations for WHERE clauses, excluding expensive aggregation operations for performance and security

By default, the multi-API store uses `defaultSelectEngine` and `defaultWhereEngine` from `@spectragraph/core`. You can provide custom engines in the configuration if needed for specialized use cases.

## API Reference

### `createMultiApiStore(schema, config)`

Creates a new multi-API store instance.

**Parameters:**

- `schema` (Schema) - The SpectraGraph schema defining resource types and relationships
- `config.resources` (object) - Configuration object mapping resource types to API handlers
- `config.specialHandlers` (array, optional) - Array of special handler objects for custom loading logic
- `config.cache` (object, optional) - Caching configuration options
- `config.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `config.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Multi-API store instance with query operations

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";

const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async (options) => {
				// Fetch skeptics from your API
				const response = await fetch("/api/skeptics", {
					method: "GET",
					headers: { "Content-Type": "application/json" },
				});
				return response.json();
			},
		},
		investigations: {
			get: async (query, context) => {
				// Fetch investigations from a different API
				const response = await fetch(
					"https://api.sciencechecks.org/investigations",
					{
						headers: { Authorization: `Bearer ${process.env.API_KEY}` },
					},
				);
				return response.json();
			},
			// Note: No CUD operations configured - will throw StoreOperationNotSupportedError
		},
	},
	specialHandlers: [
		{
			test: (query, context) =>
				query.type === "weirdBeliefs" &&
				context.parentQuery?.type === "investigations",
			handler: () => [], // Beliefs already loaded with investigations
		},
	],
});
```

### Store Operations

#### `store.query(query, options?, queryContext?)`

Executes a SpectraGraph query against the configured API endpoints.

**Parameters:**

- `query` (RootQuery) - The SpectraGraph query to execute
- `options` (object, optional) - Additional options passed to API getter functions
- `queryContext` (object, optional) - Query context for advanced scenarios

**Returns:** Promise resolving to query results matching the query structure

```javascript
const results = await store.query({
	type: "skeptics",
	select: {
		name: "name",
		specialty: "specialty",
		investigations: {
			select: ["title", "conclusion"],
		},
	},
	where: {
		yearsActive: { $gte: 10 },
	},
});
```

#### Write Operations (Create, Update, Delete)

The multi-API store supports write operations when the appropriate handlers are configured:

```javascript
// Create a new skeptic
const newSkeptic = await store.create({
	type: "skeptics",
	attributes: {
		name: "Neil deGrasse Tyson",
		specialty: "Astrophysics and Science Communication",
		yearsActive: 25,
		famousQuote: "The good thing about science is that it's true whether or not you believe in it."
	}
});

// Update an existing skeptic
const updatedSkeptic = await store.update({
	type: "skeptics", 
	id: "james-randi",
	attributes: {
		specialty: "Paranormal Investigation and Magic",
		yearsActive: 52
	}
});

// Delete a skeptic
const deletedSkeptic = await store.delete({
	type: "skeptics",
	id: "james-randi"
});
```

#### Unsupported Operations

The following operations throw `StoreOperationNotSupportedError` when called:

- `store.upsert(resource)` - Upsert operations not supported
- `store.merge(resource)` - Merge operations not supported

Write operations (create, update, delete) will also throw `StoreOperationNotSupportedError` if the corresponding handler is not configured for the resource type.

```javascript
import { StoreOperationNotSupportedError } from "@spectragraph/core";

try {
	await store.create({ type: "teams", attributes: { name: "New Team" } });
} catch (error) {
	if (error instanceof StoreOperationNotSupportedError) {
		console.log("Write operations not supported by multi-API store");
		// Handle gracefully - perhaps redirect to a writable store
	}
}
```

## Examples

### Basic Usage

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";

// 1. Define your schema
const schema = {
	resources: {
		skeptics: {
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
				specialty: { type: "string" },
				yearsActive: { type: "number" },
			},
			relationships: {
				investigations: {
					type: "investigations",
					cardinality: "many",
					inverse: "investigator",
				},
			},
		},
		investigations: {
			attributes: {
				id: { type: "string" },
				title: { type: "string" },
				conclusion: { type: "string" },
				publicationYear: { type: "number" },
			},
			relationships: {
				investigator: {
					type: "skeptics",
					cardinality: "one",
					inverse: "investigations",
				},
			},
		},
	},
};

// 2. Configure API endpoints
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async () => {
				const response = await fetch("https://api1.example.com/skeptics");
				return response.json();
			},
		},
		investigations: {
			get: async () => {
				const response = await fetch("https://api2.example.com/investigations");
				return response.json();
			},
		},
	},
});

// 3. Query the aggregated data
const results = await store.query({
	type: "skeptics",
	select: ["name", "specialty"],
	where: {
		yearsActive: { $gte: 5 },
	},
});

console.log(results);
// [
//   { name: "James Randi", specialty: "Paranormal Investigation" },
//   { name: "Michael Shermer", specialty: "Scientific Skepticism" }
// ]
```

### Advanced API Configuration with Special Handlers

```javascript
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async (options) => {
				// Use options for filtering, pagination, etc.
				const params = new URLSearchParams();
				if (options?.specialty !== undefined) {
					params.append("specialty", options.specialty);
				}

				const response = await fetch(
					`https://api1.example.com/skeptics?${params}`,
				);
				if (!response.ok) {
					throw new Error(`Skeptics API error: ${response.statusText}`);
				}
				return response.json();
			},
		},
		investigations: {
			get: async (options) => {
				// Different API with authentication
				const response = await fetch(
					"https://api2.example.com/investigations",
					{
						headers: {
							Authorization: `Bearer ${process.env.API_TOKEN}`,
							"Content-Type": "application/json",
						},
					},
				);
				return response.json();
			},
		},
		weirdBeliefs: {
			get: async (options) => {
				// Third-party API
				const response = await fetch("https://api3.example.com/beliefs", {
					headers: {
						"X-API-Key": process.env.EXTERNAL_API_KEY,
					},
				});
				const data = await response.json();

				// Transform external API format to match your schema
				return data.claims.map((belief) => ({
					id: belief.beliefId,
					name: belief.claimName,
					description: belief.description,
					category: belief.type,
					believersCount: belief.adherents,
					debunked: belief.status === "debunked",
				}));
			},
		},
	},
	specialHandlers: [
		{
			// When loading investigations from skeptics, use a more efficient endpoint
			test: (query, context) =>
				query.type === "investigations" &&
				context.parentQuery?.type === "skeptics",
			handler: async (query, context) => {
				const skepticId = context.parentQuery.id;
				const response = await fetch(
					`https://api1.example.com/skeptics/${skepticId}/investigations`,
				);
				return response.json();
			},
		},
		{
			// Avoid loading beliefs if they're already included in investigation data
			test: (query, context) =>
				query.type === "weirdBeliefs" &&
				context.parentQuery?.type === "investigations",
			handler: () => [], // Return empty - beliefs already loaded with investigations
		},
	],
});
```

### Working with Relationships

```javascript
// Query with relationship traversal
const results = await store.query({
	type: "skeptics",
	select: {
		name: "name",
		specialty: "specialty",
		investigations: {
			select: ["title", "conclusion"],
			where: {
				publicationYear: { $gte: 2000 },
			},
		},
	},
	where: {
		yearsActive: { $gte: 10 },
	},
});

console.log(results);
// [
//   {
//     name: "James Randi",
//     specialty: "Paranormal Investigation",
//     investigations: [
//       { title: "Testing Psychic Claims", conclusion: "No evidence found" },
//       { title: "Dowsing Rod Analysis", conclusion: "Results no better than chance" }
//     ]
//   }
// ]
```

### Error Handling

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";
import {
	StoreOperationNotSupportedError,
	ExpressionNotSupportedError,
} from "@spectragraph/core";

const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async () => {
				const response = await fetch("https://api1.example.com/skeptics");
				if (!response.ok) {
					throw new Error(`API error: ${response.statusText}`);
				}
				return response.json();
			},
		},
	},
});

try {
	// This will work - query operations are supported
	const skeptics = await store.query({
		type: "skeptics",
		select: ["name", "specialty"],
	});

	// This will throw StoreOperationNotSupportedError
	await store.create({
		type: "skeptics",
		attributes: { name: "New Skeptic", specialty: "Critical Thinking" },
	});
} catch (error) {
	if (error instanceof StoreOperationNotSupportedError) {
		console.log(
			`Operation ${error.operation} not supported by ${error.storeName}`,
		);
		// Handle gracefully - perhaps use a different store for writes
	} else if (error instanceof ExpressionNotSupportedError) {
		console.log(`Expression ${error.expression} not supported`);
		// Handle gracefully - perhaps use a simpler query
	} else {
		console.error("API error:", error.message);
		// Handle API errors
	}
}
```

## TypeScript Support

SpectraGraph Multi-API Store includes comprehensive TypeScript definitions:

```typescript
import type { Schema, RootQuery, QueryResult } from "@spectragraph/core";
import type {
	MultiApiStore,
	MultiApiStoreConfig,
	ApiResourceConfig,
} from "@spectragraph/multi-api-store";

const schema: Schema = {
	resources: {
		skeptics: {
			attributes: {
				id: { type: "string" },
				name: { type: "string" },
				specialty: { type: "string" },
			},
			relationships: {},
		},
	},
};

const config: MultiApiStoreConfig = {
	resources: {
		skeptics: {
			get: async (): Promise<{ [key: string]: unknown }[]> => {
				const response = await fetch("https://api1.example.com/skeptics");
				return response.json();
			},
		},
	},
};

const store: MultiApiStore = createMultiApiStore(schema, config);
```

## Use Cases

### API Gateway Pattern

Use the multi-API store as a unified query layer over multiple microservices:

```javascript
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: () =>
				fetch("https://api1.example.com/skeptics").then((r) => r.json()),
		},
		investigations: {
			get: () =>
				fetch("https://api2.example.com/investigations").then((r) => r.json()),
		},
		organizations: {
			get: () =>
				fetch("https://api3.example.com/organizations").then((r) => r.json()),
		},
	},
});
```

### Third-Party API Integration

Combine data from multiple external APIs:

```javascript
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: () =>
				fetch("https://api1.example.com/skeptics").then((r) => r.json()),
		},
		weirdBeliefs: {
			get: () =>
				fetch(`https://api4.example.com/beliefs?key=${API_KEY}`).then((r) =>
					r.json(),
				),
		},
		investigations: {
			get: () =>
				fetch(`https://api5.example.com/research?key=${RESEARCH_KEY}`).then(
					(r) => r.json(),
				),
		},
	},
});
```

### Development and Testing

Use as a mock data layer for development:

```javascript
const store = createMultiApiStore(schema, {
	resources: {
		skeptics: {
			get: async () => [
				{ id: "1", name: "James Randi", specialty: "Paranormal Investigation" },
				{
					id: "2",
					name: "Michael Shermer",
					specialty: "Scientific Skepticism",
				},
			],
		},
	},
});
```

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality and types
- `@spectragraph/memory-store` - In-memory data store implementation
- `@spectragraph/postgres-store` - PostgreSQL backend
- `@spectragraph/jsonapi-store` - JSON:API client store
