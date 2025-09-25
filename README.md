# SpectraGraph

A unified, expressive query language for multiple data sources. Query databases, APIs, and in-memory data with the same syntax, automatic relationship linking, and powerful expressions.

## Quick Example

```javascript
// Same query works across different data sources
const result = await store.query({
  type: "patrons",
  select: [
    "name",
    "email",
    {
      loans: [
        "dueDate",
        "renewalCount",
        {
          book: [
            "title",
            "isbn",
            {
              author: ["name"],
            },
          ],
        },
      ],
    },
  ],
  where: { membershipActive: true },
  limit: 10,
});

// Works with: PostgreSQL, SQLite, in-memory data, REST APIs
// Handles relationships automatically with request optimization
```

## Start Building Today, Deploy Anywhere Tomorrow

SpectraGraph lets you build with real data relationships from day one then deploy to any infrastructure without changing your queries.

### Development to Production in 3 Steps

**1. Start app development immediately with fixtures**

```javascript
import { createMemoryStore } from "@spectragraph/memory-store";

// Begin building features with realistic data
const store = createMemoryStore(schema, {
  data: {
    patrons: [{ id: "1", name: "Kenji Nakamura", libraryCard: "LIB001" }],
    books: [
      {
        id: "b1",
        title: "The Design of Everyday Things",
        isbn: "978-0465050659",
      },
    ],
  },
});
```

**2. Build up your store in parallel**

```javascript
import { createMultiApiStore } from "@spectragraph/postgres-store";

// Zero code changes in your application as you build out your config
const store = createMultiApiStore(schema, config);
```

**3. Combine the two**

```javascript
import { createMultiApiStore } from "@spectragraph/multi-api-store";

// Switch the store over seamlessly, no application changes required
const store = createMultiApiStore(schema, {
  resources: {
    patrons: {
      handlers: { query: { fetch: () => membershipAPI.getPatrons() } },
    },
    books: {
      handlers: { query: { fetch: () => catalogAPI.getBooks() } },
    },
  },
});
```

Your queries and application layer stay the same during the entire process, no matter the data layer.

### Why This Matters

- **Unblock parallel development** - App and backend teams work independently
- **Validate architecture early** - Prove data model before infrastructure complexity
- **Deploy flexibly** - Frontend aggregation today, backend service tomorrow
- **Eliminate rewrites** - Investment compounds across environments

## Performance by Design

Each store optimizes queries using its native capabilities:

- **PostgreSQL store** generates efficient SQL with proper indexes
- **Multi-API store** batches requests and caches relationships
- **Memory store** uses JavaScript's native performance for prototyping

## Installation

```bash
npm install @spectragraph/memory-store
# or choose your store: postgres-store, sqlite-store, etc.
```

## Basic Usage

```javascript
import { createMemoryStore } from "@spectragraph/memory-store";

// Define your data schema
const schema = {
  resources: {
    patrons: {
      attributes: {
        name: { type: "string" },
        email: { type: "string" },
        libraryCard: { type: "string" },
        membershipActive: { type: "boolean" },
      },
      relationships: {
        loans: {
          type: "loans",
          cardinality: "many",
          inverse: "patron",
        },
      },
    },
    books: {
      attributes: {
        title: { type: "string" },
        isbn: { type: "string" },
        publishedYear: { type: "number" },
      },
      relationships: {
        author: {
          type: "authors",
          cardinality: "one",
          inverse: "books",
        },
        loans: {
          type: "loans",
          cardinality: "many",
          inverse: "book",
        },
      },
    },
    authors: {
      attributes: {
        name: { type: "string" },
        biography: { type: "string" },
      },
      relationships: {
        books: {
          type: "books",
          cardinality: "many",
          inverse: "author",
        },
      },
    },
    loans: {
      attributes: {
        dueDate: { type: "string" },
        renewalCount: { type: "number" },
        returned: { type: "boolean" },
      },
      relationships: {
        patron: {
          type: "patrons",
          cardinality: "one",
          inverse: "loans",
        },
        book: {
          type: "books",
          cardinality: "one",
          inverse: "loans",
        },
      },
    },
  },
};

// Create store with initial data
const store = createMemoryStore(schema, {
  initialData: {
    patrons: {
      1: {
        id: "1",
        type: "patrons",
        attributes: {
          name: "Amara Okafor",
          email: "amara.okafor@email.com",
          libraryCard: "LIB001",
        },
        relationships: { loans: [{ type: "loans", id: "1" }] },
      },
    },
    authors: {
      1: {
        id: "1",
        type: "authors",
        attributes: {
          name: "Elena Rodriguez",
          biography: "Award-winning novelist and professor",
        },
        relationships: { books: [{ type: "books", id: "1" }] },
      },
    },
    books: {
      1: {
        id: "1",
        type: "books",
        attributes: {
          title: "The Art of System Design",
          isbn: "978-1234567890",
          publishedYear: 2023,
        },
        relationships: {
          author: { type: "authors", id: "1" },
          loans: [{ type: "loans", id: "1" }],
        },
      },
    },
    loans: {
      1: {
        id: "1",
        type: "loans",
        attributes: {
          dueDate: "2024-02-15",
          renewalCount: 1,
          returned: false,
        },
        relationships: {
          patron: { type: "patrons", id: "1" },
          book: { type: "books", id: "1" },
        },
      },
    },
  },
});

// Query with expressions
const analytics = await store.query({
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" },
    avgRenewals: { $avg: "loans.$.renewalCount" },
  },
});

console.log(analytics);
// [{ name: 'Amara Okafor', loanCount: 1, avgRenewals: 1 }]
```

## Learning Path (5 minutes)

**If you know JSON, you know the basics:**

```javascript
// This is just asking for patron data
{ type: "patrons", select: ["name", "email"] }
```

**If you know GraphQL, relationships work the same way:**

```javascript
// Nested data, just like GraphQL
{ type: "patrons", select: ["name", { loans: [{ book: ["title"] }] }] }
```

**If you know SQL, filtering is familiar:**

```javascript
// WHERE clauses, just in JSON
{ type: "patrons", where: { membershipActive: true }, limit: 10 }
```

**If you know JavaScript, expressions are just functions:**

```javascript
// Count and average, like Array methods
{ type: "patrons", select: { loanCount: { $count: "loans" } } }
```

## Use Cases

**Backend Development**

- **Database Abstraction** - Switch between PostgreSQL, SQLite, or in-memory stores without changing queries
- **API Integration** - Combine data from multiple services with unified query syntax
- **Microservice Data** - Query across service boundaries with automatic relationship resolution

**Frontend Development**

- **Multi-API Coordination** - Fetch related data from multiple endpoints in one query
- **Request Optimization** - Minimize API calls with intelligent batching and caching
- **Data Transformation** - Apply computations and aggregations client-side

**Data Analysis**

- **Expression-Powered Queries** - Built-in aggregations, computations, and transformations
- **Cross-Store Analytics** - Same analytical queries work on any data source
- **Dynamic Querying** - Build queries programmatically for dashboards and reports

**Custom Store Development**

- **Store Builder Toolkit** - Create stores for any data source using `@spectragraph/core`
- **Unified Interface** - Implement once, compatible with entire SpectraGraph ecosystem
- **Query Processing** - Built-in validation, normalization, and relationship handling

## Available Stores

| Store                                                         | Use Case                             | Status |
| ------------------------------------------------------------- | ------------------------------------ | ------ |
| **[@spectragraph/memory-store](packages/memory-store)**       | In-memory data, testing, prototyping | Stable |
| **[@spectragraph/multi-api-store](packages/multi-api-store)** | Multiple REST APIs, frontend BFF     | Stable |
| **[@spectragraph/postgres-store](packages/postgres-store)**   | PostgreSQL databases                 | Stable |
| **[@spectragraph/sqlite-store](packages/sqlite-store)**       | SQLite databases                     | Stable |

## Advanced Query Examples

### Filtering and Sorting

```javascript
{
  type: "books",
  select: ["title", "publishedYear"],
  where: {
    publishedYear: { $gte: 2020 }
  },
  order: [{ publishedYear: "desc" }],
  limit: 5
}
```

### Cross-Store Data Composition

```javascript
// Same query pattern works across different store types
{
  type: "patrons",
  select: ["name", {
    loans: ["dueDate", "renewalCount", {
      book: {
        select: ["title", "isbn"],
        limit: 3
      }
    }]
  }],
  where: { membershipActive: true }
}
```

## Documentation

- **[Query Guide](docs/query.md)** - Complete query language reference
- **[Schema Guide](docs/schema.md)** - Defining data structures and relationships
- **[Expression Reference](docs/expressions.md)** - Built-in functions and operators
- **[Store Creation Guide](docs/store-creation.md)** - Building custom stores
- **[API Reference](docs/api.md)** - Full API documentation

## Why SpectraGraph?

**Instead of store-specific query languages:**

```sql
-- PostgreSQL
SELECT p.name, b.title, a.name as author_name
FROM patrons p
LEFT JOIN loans l ON p.id = l.patron_id
LEFT JOIN books b ON l.book_id = b.id
LEFT JOIN authors a ON b.author_id = a.id
WHERE p.membership_active = true;
```

**Write once, run anywhere:**

```javascript
// Same query works on PostgreSQL, SQLite, in-memory, or API stores
const result = await store.query({
  type: "patrons",
  select: [
    "name",
    {
      loans: [
        "dueDate",
        {
          book: [
            "title",
            {
              author: ["name"],
            },
          ],
        },
      ],
    },
  ],
  where: { membershipActive: true },
});
```

## License

AGPL-3.0 © [Jake Sower](https://github.com/jakesower)
