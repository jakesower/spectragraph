# SpectraGraph Multi-API Store

A SpectraGraph store implementation that aggregates data from multiple API endpoints into a unified interface. Supports both read and write operations (when configured with appropriate API handlers), making it perfect for querying and managing data across REST APIs, microservices, or third-party data sources.

## Overview

SpectraGraph Multi-API Store is built around several key principles:

- **Schema-driven**: Validates all operations against your SpectraGraph schema
- **API-agnostic**: Works with any API that returns JSON data
- **Full CRUD support**: Supports create, read, update, and delete operations when configured
- **Query-compatible**: Full support for SpectraGraph's query language
- **Handler formats**: Supports standardized handler configurations
- **Special handlers**: Supports custom logic for complex data loading scenarios
- **Relationship-aware caching**: Built-in caching with relationship-based invalidation
- **Middleware support**: Authentication, retry logic, logging, and custom middleware
- **Standard HTTP handlers**: Built-in RESTful API patterns

## Installation

```bash
npm install @spectragraph/multi-api-store
```

## Design Philosophy

SpectraGraph Multi-API Store prioritizes **data consistency over raw performance**. This architectural choice eliminates an entire class of cache coherency bugs at the cost of more conservative cache invalidation. For many applications, this trade-off is favorable—especially during development and for read-heavy workloads.

### Built-in Performance Features

The library includes several performance optimizations out of the box:

- **Automatic Deduplication**: Identical queries execute only once, even across relationship traversals
- **Intelligent Caching**: TTL-based caching with relationship-aware invalidation
- **Concurrent Execution**: Related queries run in parallel using Promise.all
- **Extensible Middleware**: Plugin architecture for batching, circuit breakers, and custom optimizations

### Cache Consistency Strategy

**Read Operations**: Aggressive caching with relationship-aware dependency tracking ensures fast queries while maintaining data consistency across related resources.

**Write Operations (Create/Update/Delete)**: Conservative invalidation strategy clears cache for the modified resource type and all related types. This guarantees consistency but comes with performance trade-offs:

- **Correctness Guarantee**: You'll never see stale data, even in complex relationship scenarios
- **Performance Impact**: In highly connected schemas, write operations may clear substantial cache portions
- **Trade-off Rationale**: Eliminates cache coherency bugs that are difficult to debug and reproduce

### When This Approach Works Well

**Ideal Use Cases:**

- Development and prototyping environments
- Read-heavy applications with occasional writes
- Applications where data consistency is critical
- Teams building on complex, interconnected schemas

**Consider Alternative Strategies When:**

- Write operations significantly outnumber reads
- Microsecond response times are required
- Cache invalidation costs exceed consistency benefits
- You have sophisticated cache management requirements

### Performance Tuning Options

```javascript
// Default: Correctness-first approach
const store = createMultiApiStore(schema, {
  resources: {
    users: { handlers: { get: { fetch: fetchUsers } } },
  },
});

// Custom cache strategy for specific performance needs
const store = createMultiApiStore(schema, {
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // Shorter TTL for fresher data
    dependsOnTypes: (query) => [query.type], // Only invalidate exact type
  },
  middleware: [
    // Add custom middleware for batching, circuit breakers, etc.
    customBatchingMiddleware(),
    retry.exponential({ maxRetries: 3 }),
  ],
  resources: {
    /* handlers */
  },
});

// Disable caching for write-heavy scenarios
const store = createMultiApiStore(schema, {
  cache: { enabled: false },
  middleware: [
    /* custom performance middleware */
  ],
  resources: {
    /* handlers */
  },
});
```

This design ensures applications work correctly from day one, with clear paths for performance optimization as requirements evolve.

## Core Concepts

### Handler Configuration Formats

The multi-API store supports standardized handler configuration formats for consistency and clarity:

**Form 1 (Preferred) - With Mappers:**

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";

const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: async (context) => {
            const response = await fetch("/api/skeptics");
            return response.json();
          },
          mappers: {
            fromApi: {
              fullName: "name", // Map API's fullName to schema's name
              yearsInField: "yearsActive", // Map API field names
            },
          },
        },
        create: {
          fetch: async (resource, context) => {
            const response = await fetch("/api/skeptics", {
              method: "POST",
              body: JSON.stringify(resource.attributes),
              headers: { "Content-Type": "application/json" },
            });
            return response.json();
          },
        },
      },
    },
  },
});
```

**Form 2 (Acceptable) - With Map Function:**

```javascript
const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: async (context) => {
            const response = await fetch("/api/skeptics");
            return response.json();
          },
          map: (response) => {
            // Transform response to match schema
            return response.map((item) => ({
              ...item,
              name: item.fullName,
              yearsActive: item.yearsInField,
            }));
          },
        },
      },
    },
  },
});
```

### Operations

The multi-API store provides comprehensive data operations:

- **query** - Execute SpectraGraph queries against the aggregated APIs
- **create** - Create new resources using configured API handlers
- **update** - Update existing resources using configured API handlers
- **delete** - Delete resources using configured API handlers
- **upsert** - Create or update resources based on whether they have an ID
- **merge** - Not supported (throws `StoreOperationNotSupportedError`)

Write operations (create, update, delete, upsert) are only available when the corresponding API handlers are configured for each resource type. If a handler is not provided, the operation will throw a `StoreOperationNotSupportedError`.

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

### Relationship-Aware Caching

The multi-API store includes intelligent caching that automatically invalidates related data when resources change:

```javascript
const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: async () => {
            const response = await fetch("https://api1.example.com/skeptics");
            return response.json();
          },
        },
        create: {
          fetch: async (resource) => {
            const response = await fetch("https://api1.example.com/skeptics", {
              method: "POST",
              body: JSON.stringify(resource.attributes),
              headers: { "Content-Type": "application/json" },
            });
            return response.json();
          },
        },
      },
    },
  },
  cache: {
    enabled: true,
    defaultTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
    generateKey: (query) => {
      // Custom cache key generation
      return `${query.type}-${query.id ?? ""}-${JSON.stringify(query.select)}`;
    },
    dependsOnTypes: (query, options) => {
      // Custom relationship-aware cache invalidation
      const { schema } = options;
      const resourceType = query.type;
      const resourceSchema = schema.resources[resourceType];
      const relatedTypes = Object.values(
        resourceSchema.relationships ?? {},
      ).map((rel) => rel.type);
      return [resourceType, ...relatedTypes];
    },
  },
});
```

**Cache Configuration Options:**

- `enabled` (boolean, default: true) - Enable or disable caching
- `manual` (boolean, default: false) - Use manual cache control
- `defaultTTL` (number, default: 5 minutes) - Time-to-live for cached entries in milliseconds
- `generateKey` (function, optional) - Custom function to generate cache keys
- `dependsOnTypes` (function, optional) - Function to determine cache dependencies

**Relationship-Aware Cache Behavior:**

- Query results are cached based on the query structure and context
- **Automatic invalidation**: When a resource is created/updated/deleted, cache entries for that type AND all related types are automatically cleared
- **Relationship tracking**: Default behavior includes all relationship types in cache dependencies
- **Manual control**: Per-resource manual cache control for complex scenarios
- Expired cache entries are automatically removed on access

### Production-Ready Architecture Through Middleware

Multi-API Store's middleware architecture solves the complex production concerns that emerge when aggregating multiple APIs: batching requests, handling authentication refresh, implementing circuit breakers, managing rate limits, and adding observability. Rather than forcing these concerns into your application code or baking them into an inflexible core, the middleware pipeline lets you compose exactly the production behavior you need.

```javascript
// Production-grade API aggregation
const store = createMultiApiStore(schema, {
  middleware: [
    // Authentication with token refresh
    auth.bearerToken(() => getToken(), { refreshOnExpiry: true }),

    // Request batching - combine multiple queries into single API calls
    batchRequests({
      windowMs: 100,
      maxBatchSize: 10,
      batchableTypes: ["users", "posts"],
    }),

    // Circuit breaker - fail fast when services are degraded
    circuitBreaker({
      threshold: 5,
      resetTimeoutMs: 30000,
      monitorTypes: ["external-api"],
    }),

    // Rate limiting per API provider
    rateLimit.perBaseURL({
      "api1.example.com": { requestsPerSecond: 100 },
      "api2.example.com": { requestsPerSecond: 10 },
    }),

    // Observability and metrics
    metrics.requestTracing({
      includeTimings: true,
      sampleRate: 0.1,
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
        "X-API-Key": process.env.API_KEY,
      },
    },
  });
};
```

#### Production Patterns

**API Provider Differences**
When aggregating multiple APIs, each may have different requirements:

```javascript
const store = createMultiApiStore(schema, {
  middleware: [
    // Different auth per API
    auth.conditional({
      "internal-api.company.com": auth.bearerToken(() => getInternalToken()),
      "external-api.partner.com": auth.apiKey(process.env.PARTNER_KEY),
      "public-api.service.com": auth.none(),
    }),

    // Different retry strategies
    retry.conditional({
      "flaky-api.example.com": retry.exponential({ maxRetries: 5 }),
      "reliable-api.example.com": retry.exponential({ maxRetries: 1 }),
    }),
  ],
});
```

#### Why Middleware Architecture?

Multi-API Store uses middleware composition rather than configuration options or inheritance because production API aggregation requires composing complex, often contradictory concerns:

- **Request batching** needs to group queries while **rate limiting** needs to control timing
- **Circuit breakers** need to fail fast while **retry logic** needs to persist
- **Authentication** may require different strategies per API while **caching** needs unified keys
- **Observability** needs to capture all requests while **performance** optimizations need to reduce overhead

Middleware lets you compose exactly the behavior you need without forcing architectural decisions on your application.

**Alternative Approaches and Their Limitations**

- **Configuration-based**: Would require anticipating every possible combination of production needs
- **Inheritance/Plugin-based**: Creates tight coupling between concerns
- **Application-level**: Forces every consumer to reimplement production patterns
- **Core integration**: Creates an inflexible, monolithic store implementation

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
- `config` (object, optional) - Configuration object
- `config.resources` (object, optional) - Resource configurations with handlers
- `config.specialHandlers` (array, optional) - Array of special handler objects for custom loading logic
- `config.cache` (object, optional) - Caching configuration options with relationship-aware invalidation
- `config.middleware` (array, optional) - Middleware functions for request processing
- `config.baseURL` (string, optional) - Base URL for standard HTTP handlers
- `config.request` (object, optional) - Default request configuration
- `config.selectEngine` (SelectExpressionEngine, optional) - Expression engine for SELECT clauses
- `config.whereEngine` (WhereExpressionEngine, optional) - Expression engine for WHERE clauses

**Returns:** Multi-API store instance implementing the Store interface

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";

const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: async (context) => {
            // Fetch skeptics from your API
            const response = await fetch("/api/skeptics", {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            return response.json();
          },
        },
        create: {
          fetch: async (resource, context) => {
            const response = await fetch("/api/skeptics", {
              method: "POST",
              body: JSON.stringify(resource.attributes),
              headers: { "Content-Type": "application/json" },
            });
            return response.json();
          },
        },
      },
    },
    investigations: {
      handlers: {
        get: {
          fetch: async (context) => {
            // Fetch investigations from a different API
            const response = await fetch(
              "https://api.sciencechecks.org/investigations",
              {
                headers: { Authorization: `Bearer ${process.env.API_KEY}` },
              },
            );
            return response.json();
          },
        },
        // Note: No create/update/delete handlers - will throw StoreOperationNotSupportedError
      },
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
    famousQuote:
      "The good thing about science is that it's true whether or not you believe in it.",
  },
});

// Update an existing skeptic
const updatedSkeptic = await store.update({
  type: "skeptics",
  id: "james-randi",
  attributes: {
    specialty: "Paranormal Investigation and Magic",
    yearsActive: 52,
  },
});

// Delete a skeptic
const deletedSkeptic = await store.delete({
  type: "skeptics",
  id: "james-randi",
});
```

#### Upsert Operations

The multi-API store supports upsert operations that create or update resources based on whether they have an ID:

```javascript
// Upsert - creates if no ID, updates if ID present
const result = await store.upsert({
  type: "skeptics",
  id: "carl-sagan", // If present, will update; if absent, will create
  attributes: {
    name: "Carl Sagan",
    specialty: "Astronomy and Science Communication",
    yearsActive: 40,
  },
});
```

#### Unsupported Operations

The following operations throw `StoreOperationNotSupportedError` when called:

- `store.merge(resource)` - Merge operations not supported

Write operations (create, update, delete, upsert) will also throw `StoreOperationNotSupportedError` if the corresponding handler is not configured for the resource type.

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

// 2. Configure API endpoints with handlers
const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: async () => {
            const response = await fetch("https://api1.example.com/skeptics");
            return response.json();
          },
        },
      },
    },
    investigations: {
      handlers: {
        get: {
          fetch: async () => {
            const response = await fetch(
              "https://api2.example.com/investigations",
            );
            return response.json();
          },
        },
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
      handlers: {
        get: {
          fetch: async (context) => {
            // Use context for filtering, pagination, etc.
            const params = new URLSearchParams();
            if (context.options?.specialty !== undefined) {
              params.append("specialty", context.options.specialty);
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
      },
    },
    investigations: {
      handlers: {
        get: {
          fetch: async (context) => {
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
      },
    },
    weirdBeliefs: {
      handlers: {
        get: {
          fetch: async (context) => {
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

SpectraGraph Multi-API Store includes comprehensive TypeScript definitions with full support for the new handler formats:

```typescript
import type { Schema, RootQuery, QueryResult } from "@spectragraph/core";
import type {
  MultiApiStore,
  MultiApiStoreConfig,
  ResourceConfig,
  HandlerConfig,
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
      handlers: {
        get: {
          fetch: async (context): Promise<any[]> => {
            const response = await fetch("https://api1.example.com/skeptics");
            return response.json();
          },
          mappers: {
            fromApi: {
              fullName: "name", // Map API field to schema field
            },
          },
        },
        create: {
          fetch: async (resource, context): Promise<any> => {
            const response = await fetch("https://api1.example.com/skeptics", {
              method: "POST",
              body: JSON.stringify(resource.attributes),
              headers: { "Content-Type": "application/json" },
            });
            return response.json();
          },
        },
      },
    } satisfies ResourceConfig,
  },
  middleware: [
    // Fully typed middleware functions
    (context, next) => {
      return next({
        ...context,
        request: {
          ...context.request,
          headers: {
            ...context.request.headers,
            "X-Custom-Header": "value",
          },
        },
      });
    },
  ],
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
      handlers: {
        get: {
          fetch: () =>
            fetch("https://api1.example.com/skeptics").then((r) => r.json()),
        },
      },
    },
    investigations: {
      handlers: {
        get: {
          fetch: () =>
            fetch("https://api2.example.com/investigations").then((r) =>
              r.json(),
            ),
        },
      },
    },
    organizations: {
      handlers: {
        get: {
          fetch: () =>
            fetch("https://api3.example.com/organizations").then((r) =>
              r.json(),
            ),
        },
      },
    },
  },
});
```

### Third-Party API Integration

Combine data from multiple external APIs with response transformation:

```javascript
const store = createMultiApiStore(schema, {
  resources: {
    skeptics: {
      handlers: {
        get: {
          fetch: () =>
            fetch("https://api1.example.com/skeptics").then((r) => r.json()),
        },
      },
    },
    weirdBeliefs: {
      handlers: {
        get: {
          fetch: () =>
            fetch(`https://api4.example.com/beliefs?key=${API_KEY}`).then((r) =>
              r.json(),
            ),
          mappers: {
            fromApi: {
              beliefName: "name",
              adherentCount: "believersCount",
            },
          },
        },
      },
    },
    investigations: {
      handlers: {
        get: {
          fetch: () =>
            fetch(`https://api5.example.com/research?key=${RESEARCH_KEY}`).then(
              (r) => r.json(),
            ),
        },
      },
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
      handlers: {
        get: {
          fetch: async () => [
            {
              id: "1",
              name: "James Randi",
              specialty: "Paranormal Investigation",
            },
            {
              id: "2",
              name: "Michael Shermer",
              specialty: "Scientific Skepticism",
            },
          ],
        },
        create: {
          fetch: async (resource) => ({
            ...resource.attributes,
            id: Math.random().toString(36).substr(2, 9),
          }),
        },
      },
    },
  },
});
```

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality and types
- `@spectragraph/memory-store` - In-memory data store implementation
- `@spectragraph/postgres-store` - PostgreSQL backend
- `@spectragraph/jsonapi-store` - JSON:API client store
