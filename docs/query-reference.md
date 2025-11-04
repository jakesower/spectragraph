# Query Language Reference

**Complete reference for the SpectraGraph query language.**

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Query Structure](#query-structure)
- [Execution Order](#execution-order)
- [Select Clause](#select-clause)
- [Where Clause](#where-clause)
- [Ordering](#ordering)
- [Pagination](#pagination)
- [Grouping and Aggregation](#grouping-and-aggregation)
- [Subqueries](#subqueries)
- [Expressions](#expressions)
- [Result Shapes](#result-shapes)
- [Query Cookbook](#query-cookbook)

---

## Overview

SpectraGraph queries are JSON objects that describe what data to retrieve and how to transform it. Queries work identically across all stores (memory, PostgreSQL, SQLite, API clients), though performance characteristics may differ.

**Design Philosophy:**

- **Declarative:** Describe what you want, not how to get it
- **Composable:** Queries nest naturally for related data
- **Safe:** Runtime validation ensures correctness
- **Stateless:** Every query is independent (no query builder state)

---

## Quick Reference

```javascript
{
  // ===== RESOURCE SELECTION =====
  type: "patrons",            // Required: resource type to query

  // ===== ID FETCHING (pick one) =====
  id: "p1",                   // Single resource by ID (returns object or null)
  ids: ["p1", "p2"],          // Multiple resources by IDs (returns array)
  // (omit both to query all resources)

  // ===== FILTERING =====
  where: {                    // Filter conditions
    membershipActive: true,   // Simple equality
    age: { $gte: 18 },        // Expression operators
    $and: [...]               // Logical combinations
  },

  // ===== SORTING =====
  order: { name: "asc" },                         // Single field
  order: [{ name: "asc" }, { memberSince: "desc" }],  // Multiple fields

  // ===== PAGINATION =====
  limit: 10,                  // Maximum results
  offset: 20,                 // Skip N results

  // ===== FIELD SELECTION (pick one form) =====
  select: "*",                // All attributes

  select: ["name", "email"],  // Specific attributes

  select: {                   // Computed fields & relationships
    name: "name",             // Direct mapping
    patronName: "name",       // Alias
    loanCount: { $count: "loans" },  // Expression
    loans: {                  // Relationship subquery
      select: ["dueDate"],
      limit: 5
    }
  }

  select: ["name", "patronName", "loanCount", { // mixed, most idiomatic
    loans: { select: ["dueDate"], limit: 5}
  }]
}
```

---

## Query Structure

Every query is an object with these components:

### Required Fields

- **`type`** _(string)_ - The resource type to query. Must match a resource defined in your schema.

- **`select`** _(string | array | object)_ - Fields to retrieve. See [Select Clause](#select-clause).

### Optional Fields

- **`id`** _(string)_ - Fetch a single resource by ID. Returns single object or `null`. Mutually exclusive with `ids`.

- **`ids`** _(string[])_ - Fetch multiple specific resources by IDs. Returns array. Mutually exclusive with `id`.

- **`where`** _(object)_ - Filter conditions. See [Where Clause](#where-clause).

- **`order`** _(object | object[])_ - Sort order. See [Ordering](#ordering).

- **`limit`** _(integer ≥ 1)_ - Maximum number of results to return.

- **`offset`** _(integer ≥ 0)_ - Number of results to skip (for pagination).

### Validation

Queries are validated against your schema before execution:

```javascript
import { validateQuery } from "@spectragraph/core";

const errors = validateQuery(schema, query);
if (errors.length > 0) {
  console.error("Invalid query:", errors);
}
```

Validation checks:

- Resource type exists in schema
- Attributes exist on resource
- Relationships are valid
- Expression syntax is correct
- `id` and `ids` aren't both present

---

## Execution Order

Query operations execute in this specific order:

```
1. id/ids       → Select specific resources
2. where        → Filter resources
3. order        → Sort results
4. offset       → Skip N results
5. limit        → Take first N results
6. select       → Project and transform fields
```

### Why This Matters

Understanding execution order explains query behavior:

```javascript
{
  type: "patrons",
  ids: ["p1", "p2", "p3", "p4", "p5"],    // 1. Start with 5 specific patrons
  where: { membershipActive: true },      // 2. Filter to active patrons only
  order: { name: "asc" },                 // 3. Sort by name
  offset: 1,                              // 4. Skip first result
  limit: 2,                               // 5. Take next 2 results
  select: ["name", "email"]               // 6. Return only name and email
}

// Execution flow:
// Patrons [p1,p2,p3,p4,p5] → Filter active → Sort → Skip 1 → Take 2 → Project fields
// Result: 2 patrons, sorted by name, with only name/email fields
```

### Combining ids and where

You can filter a specific set of IDs:

```javascript
{
  type: "patrons",
  ids: ["p1", "p2", "p3", "p4"],
  where: { membershipActive: true }
}
// Returns: Only the active patrons from the specified IDs
// (Not all active patrons)
```

---

## Select Clause

The `select` clause determines which fields appear in results. It accepts three forms: string, array, or object.

### Form 1: String (Wildcard)

Select all attributes defined in the schema:

```javascript
{
  type: "patrons",
  select: "*"
}

// With schema:
// attributes: { id, name, email, libraryCard, membershipActive }

// Returns:
[
  { id: "p1", name: "Amara Okafor", email: "amara@example.com", libraryCard: "LIB001", membershipActive: true },
  { id: "p2", name: "Kenji Nakamura", email: "kenji@example.com", libraryCard: "LIB002", membershipActive: true }
]
```

**Note:** Only selects _attributes_, not relationships. Use array or object form for relationships.

### Form 2: Array (Simple Selection)

Select specific attributes and relationships:

```javascript
// Attributes only
{
  type: "patrons",
  select: ["name", "email"]
}

// Mix attributes and relationships
{
  type: "patrons",
  select: [
    "name",
    "email",
    { loans: ["dueDate", "renewalCount"] }
  ]
}

// Wildcard with relationships
{
  type: "patrons",
  select: [
    "*",                                   // All attributes
    { loans: { select: ["dueDate"] } }     // Plus loans
  ]
}
```

**Array Form Rules:**

- Strings must be valid attribute names or `"*"`
- Objects represent relationship subqueries
- Can mix strings and objects freely
- Wildcard `"*"` expands to all attributes

### Form 3: Object (Aliasing & Expressions)

The most powerful form, supporting aliases, expressions, and computed fields:

```javascript
{
  type: "patrons",
  select: {
    // Direct mapping (field name → attribute name)
    name: "name",
    email: "email",

    // Aliasing (rename fields)
    patronName: "name",
    contactEmail: "email",

    // Expressions (computed fields)
    loanCount: { $count: "loans" },
    isActive: { $eq: [{ $get: "membershipActive" }, true] },

    // Relationships with subqueries
    loans: {
      select: ["dueDate", "renewalCount"],
      order: { dueDate: "asc" },
      limit: 5
    },

    // Nested expressions
    fullName: {
      $join: [
        { $get: "firstName" },
        " ",
        { $get: "lastName" }
      ]
    }
  }
}
```

**Object Form Rules:**

- Keys are output field names
- String values are attribute names to map
- Expression values are computed
- Object values (with `select`) are relationship subqueries
- Special key `"*"` includes all attributes

### Wildcard in Object Form

```javascript
{
  type: "patrons",
  select: {
    "*": "*",                           // Include all attributes
    loanCount: { $count: "loans" }      // Plus computed field
  }
}

// Equivalent to:
{
  type: "patrons",
  select: {
    id: "id",
    name: "name",
    email: "email",
    libraryCard: "libraryCard",
    // ... all other attributes
    loanCount: { $count: "loans" }
  }
}
```

### Form Equivalence

These queries are equivalent after normalization:

```javascript
// Array form
select: ["name", "email", { loans: ["dueDate"] }]

// Object form
select: {
  name: "name",
  email: "email",
  loans: {
    select: {
      dueDate: "dueDate"
    }
  }
}
```

SpectraGraph normalizes all forms to the object form internally.

### Select Best Practices

**Use string form when:**

- You want all attributes: `select: "*"`

**Use array form when:**

- Selecting specific attributes: `select: ["name", "email"]`
- Simple relationship traversal: `select: ["name", { loans: ["dueDate"] }]`
- A mix of things **most commonly used form**:
  `select: ["name", { loanCount: { $count: "loans" }, loans: ["dueDate"] }]`

**Use object form when:**

- Aliasing fields: `patronName: "name"`
- Computing fields: `loanCount: { $count: "loans" }`
- Complex subqueries: `loans: { select: [...], where: {...}, limit: 5 }`

---

## Where Clause

Filter resources based on attribute values and expressions.

### Simple Equality

```javascript
// Single condition
where: { membershipActive: true }

// Multiple conditions (implicit AND)
where: {
  membershipActive: true,
  membershipType: "premium"
}
```

### Expression Operators

Use expression operators for comparisons:

```javascript
// Numeric comparisons
where: {
  age: {
    $gte: 18,
  }
}
where: {
  renewalCount: {
    $lt: 3,
  }
}

// String matching
where: {
  name: {
    $matchesRegex: "^Kenji",
  }
}
where: {
  email: {
    $matchesLike: "%@example.com",
  }
}

// Array membership
where: {
  membershipType: {
    $in: ["basic", "premium"],
  }
}
where: {
  status: {
    $nin: ["suspended", "expired"],
  }
}

// Negation
where: {
  returned: {
    $ne: true,
  }
}
```

### Logical Operators

Combine conditions with AND, OR, NOT:

```javascript
// OR
where: {
  $or: [{ status: { $eq: "active" } }, { age: { $lt: 18 } }];
}

// AND (explicit, though implicit AND works too)
where: {
  $and: [{ age: { $gte: 18 } }, { age: { $lte: 65 } }];
}

// AND (alternative form, means same thing as above)
where: {
  age: {
    $and: [{ $gte: 18 }, { $lte: 65 }];
  }
}

// NOT
where: {
  $not: {
    status: {
      $eq: "banned",
    }
  }
}

// Complex combinations
where: {
  $and: [
    { age: { $gte: 18 } },
    {
      $or: [{ status: { $eq: "active" } }, { verified: { $eq: true } }],
    },
  ];
}
```

### Available Operators

The WHERE clause supports a **restricted set** of expression operators (filtering only, no aggregations):

| Category             | Operators             | Description                                 |
| -------------------- | --------------------- | ------------------------------------------- |
| **Comparison**       | `$eq`, `$ne`          | Equal, not equal                            |
|                      | `$gt`, `$gte`         | Greater than, greater than or equal         |
|                      | `$lt`, `$lte`         | Less than, less than or equal               |
|                      | `$in`, `$nin`         | In array, not in array                      |
| **Logic**            | `$and`, `$or`, `$not` | Logical AND, OR, NOT                        |
| **Pattern Matching** | `$matchesRegex`       | Regular expression match                    |
| **Existence**        | `$isPresent`          | Check if value exists/is truthy             |
| **Composition**      | `$pipe`               | Run expressions in sequence (USE CAERFULLY) |

#### A Word on `$pipe`

`$pipe` is a powerful composition expression that should be used with care in WHERE expressions. It's necessary for sequencing in some cases.

**Feed "age" attribute to `isPresent`**
`where: { $pipe: [{ $get: "age" }, { $isPresent: null } ] }`

This pattern is discouraged, but should be kept in your back pocket for situations where.

**Better expression for the above**

`where { age: { $isPresent: true } }`

### WHERE vs SELECT Expressions

**Not available in WHERE:**

- Aggregations: `$groupBy`, `$count`, `$sum`, `$avg`, `$min`, etc.
- Transformations: `$map`, `$filter`, `$join`
- Math operations: `$add`, `$multiply`, etc.

**Why?** Performance and security. WHERE runs on potentially large datasets; expensive operations are disabled. This can be overridden by supplying a custom expression engine when needed, but this is advanced behavior and not recommended for most users.

**Use aggregations in SELECT instead:**

```javascript
// Don't do this
where: {
  loans: { $count: { $gt: 5 } }  // Error: $count not available in WHERE
}

// Do this instead
{
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" }  // Compute in SELECT
  },
}
// Then filter results in application code
```

### Store-Specific Behavior

Different stores handle WHERE clauses differently:

- **Memory Store:** Full expression support, filters in JavaScript
- **SQL Stores:** Translates to SQL `WHERE` clauses; some expressions may not translate to SQL, causing a drop in performance, but still work due to post-processing
- **API Stores:** May push filters to API or filter client-side

Check your store's documentation for specific limitations and best practices.

---

## Ordering

Sort results by one or more attributes.

### Single Field

```javascript
// Ascending order
{
  type: "patrons",
  select: ["name"],
  order: { name: "asc" }
}

// Descending order
{
  type: "loans",
  select: ["dueDate", "renewalCount"],
  order: { dueDate: "desc" }
}
```

### Multiple Fields

Use an array of objects when sorting by multiple fields. **Order matters:**

```javascript
{
  type: "patrons",
  select: ["name", "memberSince"],
  order: [
    { name: "asc" },           // Primary sort: by name A-Z
    { memberSince: "desc" }    // Secondary sort: ties broken by newest first
  ]
}
```

### Valid Sort Directions

- `"asc"` - Ascending (A→Z, 0→9, old→new)
- `"desc"` - Descending (Z→A, 9→0, new→old)

### Sorting Rules

**Can sort by:**

- Any attribute defined in the schema
- Only attributes (not computed fields)

**Cannot sort by:**

- Relationships
- Expressions or computed fields
- Fields not in the schema

```javascript
// This doesn't work
{
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" }  // Computed field
  },
  order: { loanCount: "desc" }      // Error: loanCount is not an attribute
}
```

**Workaround:** Some stores support computed field sorting:

- **Memory Store:** Sort results in application code after query
- **SQL Stores:** May support in query translation (check store docs)

### Ordering in Subqueries

Order works in relationship subqueries:

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    recentLoans: {
      select: ["dueDate", "renewalCount"],
      order: { dueDate: "desc" },  // Order nested results
      limit: 5
    }
  }
}
```

---

## Pagination

Limit and offset results for pagination.

### Limit

Restrict the number of results:

```javascript
{
  type: "books",
  select: ["title"],
  limit: 10  // Return at most 10 results
}
```

**Rules:**

- Must be an integer ≥ 1
- Applied **after** filtering and sorting
- Returns fewer results if not enough match

### Offset

Skip a number of results:

```javascript
{
  type: "books",
  select: ["title"],
  offset: 20  // Skip first 20 results
}
```

**Rules:**

- Must be an integer ≥ 0
- Applied **after** filtering and sorting, **before** limit
- If offset exceeds result count, returns empty array

### Combining Limit and Offset

Standard pagination pattern:

```javascript
// Page 1 (items 0-9)
{
  type: "books",
  select: ["title"],
  order: { publishedYear: "desc" },
  limit: 10,
  offset: 0
}

// Page 2 (items 10-19)
{
  type: "books",
  select: ["title"],
  order: { publishedYear: "desc" },
  limit: 10,
  offset: 10
}

// Page N (items (N-1)*10 to N*10-1)
{
  type: "books",
  select: ["title"],
  order: { publishedYear: "desc" },
  limit: 10,
  offset: (page - 1) * 10
}
```

### Pagination in Subqueries

Limit and offset work in relationship subqueries:

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    recentLoans: {
      select: ["dueDate"],
      order: { createdAt: "desc" },
      limit: 5,        // Limit nested results
      offset: 0
    }
  }
}
```

### Performance Considerations

- **Memory Store:** Loads all data, then slices (inefficient for large datasets)
- **SQL Stores:** Translates to `LIMIT`/`OFFSET` (efficient)
- **API Stores:** May paginate requests or fetch all then slice (check store docs)

---

## Grouping and Aggregation

SpectraGraph supports grouping resources and computing aggregates via the `group` clause. Queries use either `select` (regular queries) OR `group` (aggregation queries), but not both at the top level.

**Availability:** Currently supported in memory-store. SQL store support is in development.

### Basic Syntax

```javascript
{
  type: "books",
  group: {
    by: "genre",                    // Required: field(s) to group by
    select: ["genre"],              // Optional: fields to return (defaults to `by`)
    aggregates: {                   // Optional: computed aggregates
      total: { $count: null }
    },
    where: { ... },                 // Optional: filter within groups
    order: { total: "desc" },       // Optional: sort groups
    limit: 10,                      // Optional: limit groups
    offset: 0                       // Optional: skip groups
  }
}
```

### Group By

Specify one or more attributes to group by:

```javascript
// Grand totals (empty array - all resources in one group)
{
  type: "books",
  group: {
    by: [],
    aggregates: {
      totalBooks: { $count: null },
      totalPages: { $sum: { $pluck: "pageCount" } }
    }
  }
}
// Returns: [{ totalBooks: 1543, totalPages: 423891 }]

// Single field
{
  type: "books",
  group: {
    by: "genre"
  }
}
// Returns: [{ genre: "fiction" }, { genre: "nonfiction" }]

// Multiple fields
{
  type: "books",
  group: {
    by: ["genre", "publishedYear"]
  }
}
// Returns: [
//   { genre: "fiction", publishedYear: 2020 },
//   { genre: "fiction", publishedYear: 2021 },
//   ...
// ]

// Array form (same as single string)
{
  type: "books",
  group: {
    by: ["genre"]  // Equivalent to: by: "genre"
  }
}
```

**Rules:**

- `by` is required
- Can be an empty array `[]` (creates single group with all resources - grand totals)
- Must reference valid schema attributes (not relationships) when non-empty
- Can be a string or array of strings
- Groups with null values are grouped together

### Aggregates

Compute values over each group using expressions:

```javascript
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null },
      totalPages: { $sum: { $pluck: "pageCount" } },
      avgPages: { $mean: { $pluck: "pageCount" } },
      longestBook: { $max: { $pluck: "pageCount" } },
      shortestBook: { $min: { $pluck: "pageCount" } }
    }
  }
}
// Returns: [
//   {
//     genre: "fiction",
//     count: 150,
//     totalPages: 45000,
//     avgPages: 300,
//     longestBook: 650,
//     shortestBook: 180
//   },
//   ...
// ]
```

**Common Aggregate Patterns:**

```javascript
// Count items
{
  $count: null;
}

// Sum field values
{
  $sum: {
    $pluck: "fieldName";
  }
}

// Average
{
  $mean: {
    $pluck: "fieldName";
  }
}

// Maximum
{
  $max: {
    $pluck: "fieldName";
  }
}

// Minimum
{
  $min: {
    $pluck: "fieldName";
  }
}

// Collect values into array
{
  $pluck: "fieldName";
}

// Multiple operations composed
{
  $sum: {
    $map: {
      $multiply: [{ $get: "quantity" }, { $get: "price" }];
    }
  }
}
```

**Rules:**

- Each aggregate must be a valid SELECT expression
- Can reference any field from the grouped resources
- Cannot reference relationships directly

Aggregates operate on the array of items in each group. That means you'll want to use `$pluck` instead of `$get` for most of your addressing needs. This can take a bit of getting used to at first.

### Select in Groups

Control which fields appear in output and add computed fields:

```javascript
// Default: `by` fields are automatically selected
{
  type: "books",
  group: {
    by: "genre"
  }
}
// Returns: [{ genre: "fiction" }, { genre: "nonfiction" }]

// Explicit select (rename fields)
{
  type: "books",
  group: {
    by: "genre",
    select: { category: "genre" }
  }
}
// Returns: [{ category: "fiction" }, { category: "nonfiction" }]

// Computed fields
{
  type: "books",
  group: {
    by: "pageCount",
    select: [
      "pageCount",
      {
        tier: {
          $if: {
            if: { $gte: [{ $get: "pageCount" }, 1000] },
            then: "sprawling",
            else: "reasonable"
          }
        }
      }
    ]
  }
}

// Mix of select and aggregates
{
  type: "books",
  group: {
    by: ["genre", "publishedYear"],
    select: {
      category: "genre",
      year: "publishedYear"
    },
    aggregates: {
      count: { $count: null }
    }
  }
}
// Returns: [
//   { category: "fiction", year: 2020, count: 45 },
//   ...
// ]
```

**Rules:**

- `select` is optional (defaults to `by` fields)
- Can only reference `by` fields (not arbitrary attributes)
- Cannot reference relationships
- Supports expressions for computed fields
- Computed fields can be used in nested grouping

### Filtering Within Groups

**Top-Level Where** (filters resources before grouping):

```javascript
{
  type: "books",
  where: { year: 2024 },        // Filter sales BEFORE grouping
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    }
  }
}
```

**Group-Level Where** (filters groups after aggregation, like SQL HAVING):

```javascript
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    },
    where: { $gt: [{ $get: "count" }, 100] }  // Filter GROUPS
  }
}
// Returns only regions with >100 sales
```

**Both Together:**

```javascript
{
  type: "books",
  where: { year: 2024 },          // First: filter sales records
  group: {
    by: "genre",
    aggregates: {
      revenue: { $sum: { $pluck: "pageCount" } }
    },
    where: { $gt: [{ $get: "avgPages" }, 400] }  // Then: filter groups
  }
}
```

**Rules:**

- Top-level `where` filters resources (applied before grouping)
- Group-level `where` filters groups (applied after aggregation)
- Group `where` can reference fields from `select` or `aggregates`
- Uses the same expressions as regular queries

### Ordering Groups

Sort groups by any field in `select` or `aggregates`:

```javascript
// Sort by aggregate
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      revenue: { $sum: { $pluck: "pageCount" } }
    },
    order: { revenue: "desc" }
  }
}

// Sort by group field
{
  type: "books",
  group: {
    by: ["genre", "publishedYear"],
    order: [
      { genre: "asc" },
      { publishedYear: "asc" }
    ]
  }
}

// Sort by computed field
{
  type: "books",
  group: {
    by: "genre",
    select: [
      "genre",
      { tier: { $if: { ... } } }
    ],
    order: { tier: "desc" }
  }
}
```

**Rules:**

- Can only order by fields from `select` or `aggregates`
- Cannot order by `by` fields unless they're in `select`
- Uses same syntax as regular query `order`

### Pagination with Groups

Limit and offset work on groups (not individual resources):

```javascript
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      revenue: { $sum: { $pluck: "pageCount" } }
    },
    order: { revenue: "desc" },
    limit: 10,      // Top 10 genres
    offset: 0
  }
}

// Paginate groups
{
  type: "books",
  group: {
    by: ["author", "genre"],
    aggregates: { count: { $count: null } },
    order: [{ author: "asc" }, { genre: "asc" }],
    limit: 20,
    offset: 40    // Skip first 40 groups
  }
}
```

### Nested Grouping

Groups can contain nested `group` clauses for multi-level aggregation:

```javascript
{
  type: "books",
  group: {
    by: "genre",
    select: {
      isSpeculativeFiction: {
        $pipe: [{ $get: "genre" }, { $in: ["fantasy", "science fiction"] }]
      }
    },
    group: {                       // Nested group
      by: "isSpeculativeFiction",
      aggregates: {
        bookCount: { $count: null },
      },
      order: { bookCount: "desc" }
    }
  }
}
// Returns: [
//   { isSpeculativeFiction: true, bookCount: 943 },
//   { isSpeculativeFiction: false, bookCount: 19322 }
// ]
```

**Rules:**

- Nested groups operate on the results of the parent group
- Can reference any field from parent's `select` or `aggregates`
- Supports arbitrary nesting depth
- Each level can have its own `where`, `order`, `limit`, `offset`

### Complete Example

```javascript
{
  type: "books",
  // Filter resources before grouping
  where: {
    publishedYear: { $gte: 2020 },
    inPrint: true
  },
  // Group and aggregate
  group: {
    by: ["genre", "author"],
    select: {
      category: "genre",
      writer: "author"
    },
    aggregates: {
      bookCount: { $count: null },
      totalPages: { $sum: { $pluck: "pageCount" } },
      avgPages: { $mean: { $pluck: "pageCount" } }
    },
    // Filter groups (HAVING)
    where: { $gt: [{ $get: "bookCount" }, 3] },
    // Sort groups
    order: [
      { totalPages: "desc" },
      { category: "asc" }
    ],
    // Paginate groups
    limit: 20,
    offset: 0
  }
}
```

### Query Structure with Groups

When using `group`, the query structure changes:

```javascript
// Regular query (select mode)
{
  type: "books",
  select: ["genre", "pageCount"],  // Required for regular queries
  where: { ... },
  order: { ... },
  limit: 10
}

// Aggregation query (group mode)
{
  type: "books",
  group: {                      // Mutually exclusive with `select`
    by: "genre",
    aggregates: { ... }
  },
  where: { ... },               // Filters resources before grouping
  order: { ... },               // Sorts before grouping
  limit: 10                     // Limits before grouping (offset OK too)
}
```

**Important:** When using `group`:

- Top-level `select` is not allowed (use `group.select` instead)
- Top-level `where` filters resources before grouping
- Top-level `order`, `limit`, `offset` are applied before grouping
- Top-level `id` is not supported with grouping
- Top-level `ids` can be used to group specific resources

---

## Subqueries

Any relationship can include a full query with almost all standard query operations. `id` and `ids` are not supported.

### Basic Relationship Traversal

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    loans: {
      select: ["dueDate", "renewalCount"]
    }
  }
}

// Returns:
[
  {
    name: "Amara Okafor",
    loans: [
      { dueDate: "2024-02-15", renewalCount: 1 },
      { dueDate: "2024-02-20", renewalCount: 0 }
    ]
  }
]
```

### Full Query in Subquery

Every relationship subquery supports all query operations:

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    currentLoans: {
      where: { returned: false },        // Filter
      order: { dueDate: "asc" },         // Sort
      limit: 10,                         // Limit
      offset: 0,                         // Offset
      select: {                          // Select
        dueDate: "dueDate",
        bookTitle: { $get: "book.title" },    // Expressions
        renewalCount: "renewalCount"
      }
    }
  }
}
```

### Nested Subqueries

Queries can nest to arbitrary depth:

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    loans: {
      select: {
        dueDate: "dueDate",
        book: {
          select: {
            title: "title",
            author: {
              select: {
                name: "name",
                biography: "biography"
              }
            }
          }
        }
      }
    }
  }
}
```

**Note:** Deep nesting can sometimes cause performance issues, including multiple queries, large result sets, and high memory usage. Take care to monitor these queries and ensure you're working with your store's way of doing things.

### Subquery Result Shapes

Subquery results match relationship cardinality:

```javascript
// One-to-many relationship
{
  type: "patrons",
  select: {
    name: "name",
    loans: { select: ["dueDate"] }  // Returns array
  }
}
// Result:
{ name: "Amara Okafor", loans: [{ dueDate: "..." }, { dueDate: "..." }] }

// Many-to-one relationship
{
  type: "loans",
  select: {
    dueDate: "dueDate",
    patron: { select: ["name"] }  // Returns object or null
  }
}
// Result:
{ dueDate: "2024-02-15", patron: { name: "Kenji Nakamura" } }
```

### The `type` Field in Subqueries

The `type` field is **optional** in subqueries—it's inferred from the relationship:

```javascript
{
  type: "patrons",
  select: {
    loans: {
      // No 'type' needed—inferred from schema relationship
      select: ["dueDate"]
    }
  }
}
```

However, it's **included** in the normalized query for internal consistency.

---

## Expressions

SpectraGraph integrates the [json-expressions](https://github.com/jakesower/json-expressions) library for computed fields, transformations, and filtering.

### Expression Engines

SpectraGraph uses **two different expression engines** depending on context:

#### WHERE Engine (Restricted)

Used in `where` clauses. Supports **filtering operations only**:

**Available:**

- Comparisons: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`
- Logic: `$and`, `$or`, `$not`
- Pattern matching: `$matchesRegex`, `$matchesLike`, `$matchesGlob`
- Utility: `$get`, `$isPresent`

**Not available:**

- Aggregations: `$count`, `$sum`, `$avg`, `$min`, `$max`, `$mean`, `$median`
- Transformations: `$map`, `$filter`, `$flatMap`, `$join`, `$reverse`
- Math: `$add`, `$subtract`, `$multiply`, `$divide`

**Why restricted?** WHERE clauses run on potentially large datasets before filtering. Expensive aggregation and transformation operations are disabled for performance and security.

#### SELECT Engine (Full Power)

Used in `select` clauses. Supports **all expression operators**:

- Everything from WHERE engine
- Aggregations: `$count`, `$sum`, `$avg`, `$min`, `$max`, `$mean`, `$median`, `$mode`
- Array operations: `$map`, `$filter`, `$find`, `$flatMap`, `$join`, `$reverse`, `$append`, `$prepend`
- Math: `$add`, `$subtract`, `$multiply`, `$divide`, `$modulo`
- Conditionals: `$if`, `$switch`, `$case`
- String operations: `$join`, composition functions
- Temporal: `$nowLocal`, `$nowUTC`, `$timestamp`
- Generative: `$random`, `$uuid`

### Expression Syntax

Expressions are JSON objects with a single key (the operator) and a value (the parameters):

```javascript
// Simple comparison
{
  $gte: 18;
}

// With explicit input
{
  $gte: [{ $get: "age" }, 18];
}

// Nested expressions
{
  $add: [
    { $multiply: [{ $get: "price" }, { $get: "quantity" }] },
    { $get: "shipping" },
  ];
}
```

### Referencing Attributes

In **SELECT**, use `$get` to reference attributes:

```javascript
select: {
  // Direct attribute
  age: "age",

  // Expression using attribute
  isAdult: {
    $gte: [{ $get: "age" }, 18]
  },

  // Complex expression
  fullName: {
    $join: [
      { $get: "firstName" },
      " ",
      { $get: "lastName" }
    ]
  }
}
```

In **WHERE**, context is implicit (applied to attribute automatically):

```javascript
where: {
  age: {
    $gte: 18;
  } // Applied to 'age' attribute
}

// Equivalent to (in SELECT):
where: {
  age: {
    $gte: [{ $get: "age" }, 18]; // Explicit in SELECT
  }
}
```

### Common Expression Patterns

#### Comparisons

```javascript
// Numeric
{
  $eq: 5,
} // Equal to 5
{
  $ne: 0,
} // Not equal to 0
{
  $gt: 10,
} // Greater than 10
{
  $gte: 18,
} // Greater than or equal to 18
{
  $lt: 100,
} // Less than 100
{
  $lte: 65,
} // Less than or equal to 65

// Array membership
{
  $in: ["active", "pending"],
}
{
  $nin: ["deleted", "banned"],
}
```

#### Logic

```javascript
// AND
{
  $and: [{ $gte: [{ $get: "age" }, 18] }, { $lte: [{ $get: "age" }, 65] }];
}

// OR
{
  $or: [
    { $eq: [{ $get: "membershipType" }, "premium"] },
    { $eq: [{ $get: "membershipType" }, "moderator"] },
  ];
}

// NOT
{
  $not: {
    $eq: [{ $get: "status" }, "banned"];
  }
}
```

#### Aggregations (SELECT only)

```javascript
// Count relationships
loanCount: {
  $count: "loans",
}

// Sum values
totalFines: {
  $sum: {
    $get: "loans.$.fineAmount",
  }
}

// Average
avgRating: {
  $avg: {
    $get: "reviews.$.rating",
  }
}
```

#### Transformations (SELECT only)

```javascript
// Map over array
bookTitles: {
  $map: [{ $get: "books" }, { $get: "title" }],
}

// Filter array
activeLoans: {
  $filter: [{ $get: "loans" }, { $get: "active" }],
}

// Join strings
tags: {
  $join: [{ $get: "genreList" }, ", "],
}
```

#### Conditionals (SELECT only)

```javascript
// If-then-else
displayName: {
  $if: {
    if: { $isPresent: { $get: "nickname" } },
    then: { $get: "nickname" },
    else: { $get: "fullName" }
  }
}

// Switch-case
ageGroup: {
  $case: {
    value: { $get: "age" },
    cases: [
      { when: { $lt: 13 }, then: "child" },
      { when: { $lt: 20 }, then: "teen" },
      { when: { $lt: 65 }, then: "adult" }
    ],
    default: "senior"
  }
}
```

#### Math (SELECT only)

```javascript
// Basic arithmetic
total: {
  $add: [{ $get: "subtotal" }, { $get: "tax" }],
}

discount: {
  $multiply: [{ $get: "price" }, 0.15],
}

// Complex calculation
finalPrice: {
  $subtract: [
    { $get: "price" },
    { $multiply: [{ $get: "price" }, { $get: "discountPercent" }] },
  ];
}
```

### Full Operator Reference

See the [json-expressions documentation](https://github.com/jakesower/json-expressions) for the complete list of operators and detailed usage.

#### WHERE Clause Operators

The WHERE clause uses the `filteringPack` from json-expressions.

**Comparisons:** `$between`, `$eq`, `$gt`, `$gte`, `$in`, `$lt`, `$lte`, `$ne`, `$nin`

**Logic:** `$and`, `$not`, `$or`

**Pattern Matching:** `$exists`, `$isEmpty`, `$isPresent`, `$matchesAll`, `$matchesRegex`

**Array Filtering:** `$all`, `$any`, `$filter`, `$filterBy`, `$find`

#### SELECT Clause Operators

The SELECT clause uses `filteringPack`, `projectionPack`, `aggregationPack`, and `mathPack` from json-expressions.

**Data Access:** `$get`, `$select`

**Conditionals:** `$case`, `$if`

**Logic:** `$and`, `$not`, `$or`

**Comparisons:** `$between`, `$eq`, `$gt`, `$gte`, `$in`, `$lt`, `$lte`, `$ne`, `$nin`

**Pattern Matching:** `$exists`, `$isEmpty`, `$isPresent`, `$matchesRegex`

**Aggregation:** `$count`, `$first`, `$groupBy`, `$last`, `$max`, `$mean`, `$min`, `$sum`

**Array Operations:** `$all`, `$any`, `$concat`, `$filter`, `$filterBy`, `$find`, `$flatMap`, `$join`, `$map`, `$pluck`, `$unique`

**String Operations:** `$lowercase`, `$substring`, `$uppercase`

**Math:** `$abs`, `$add`, `$divide`, `$modulo`, `$multiply`, `$pow`, `$sqrt`, `$subtract`

---

## Result Shapes

Query results vary based on the `id` field:

### Single Resource Query

When using `id`, returns **single object or null**:

```javascript
{
  type: "patrons",
  id: "p1",
  select: ["name", "email"]
}

// Resource found:
{ name: "Amara Okafor", email: "amara@example.com" }

// Resource not found:
null
```

### Collection Query

When using `ids`, `where`, or neither, returns **array** (possibly empty):

```javascript
// Multiple IDs
{
  type: "patrons",
  ids: ["p1", "p2"],
  select: ["name"]
}
// Returns: [{ name: "Amara Okafor" }, { name: "Kenji Nakamura" }]

// With filter
{
  type: "patrons",
  where: { membershipActive: true },
  select: ["name"]
}
// Returns: [{ name: "..." }, ...]

// All resources
{
  type: "patrons",
  select: ["name"]
}
// Returns: [{ name: "..." }, ...]

// No matches
{
  type: "patrons",
  where: { status: "nonexistent" },
  select: ["name"]
}
// Returns: []
```

### Relationship Result Shapes

Relationship fields match schema cardinality:

```javascript
// One-to-many (always array)
{
  type: "patrons",
  id: "p1",
  select: {
    name: "name",
    loans: { select: ["dueDate"] }
  }
}
// Result:
{
  name: "Amara Okafor",
  loans: [{ dueDate: "..." }, { dueDate: "..." }]
}

// Many-to-one (single object or null)
{
  type: "loans",
  id: "l1",
  select: {
    dueDate: "dueDate",
    patron: { select: ["name"] }
  }
}
// Result:
{
  dueDate: "2024-02-15",
  patron: { name: "Kenji Nakamura" }  // or null if no patron
}
```

---

## Query Cookbook

Real-world query patterns for common use cases.

### Pagination

```javascript
// Helper function
function paginateQuery(baseQuery, page, perPage = 10) {
  return {
    ...baseQuery,
    limit: perPage,
    offset: (page - 1) * perPage
  };
}

// Page 1
{
  type: "books",
  select: ["title", "isbn"],
  order: { createdAt: "desc" },
  limit: 10,
  offset: 0
}

// Page 2
{
  type: "books",
  select: ["title", "isbn"],
  order: { publishedYear: "desc" },
  limit: 10,
  offset: 10
}
```

### Search & Filtering

```javascript
// Text search (case-insensitive)
{
  type: "books",
  where: {
    title: { $matchesRegex: "(?i)design" }
  },
  select: ["title", "isbn"]
}

// Multiple status values
{
  type: "loans",
  where: {
    status: { $in: ["active", "overdue", "renewed"] }
  },
  select: ["id", "dueDate", "status"]
}

// Date range
{
  type: "loans",
  where: {
    $and: [
      { dueDate: { $gte: "2024-01-01" } },
      { dueDate: { $lt: "2024-02-01" } }
    ]
  },
  select: ["dueDate", "renewalCount"]
}

// Combining filters
{
  type: "books",
  where: {
    $and: [
      { publishedYear: { $gte: 2000 } },
      { available: { $eq: true } },
      {
        $or: [
          { genre: { $eq: "science" } },
          { genre: { $eq: "technology" } }
        ]
      }
    ]
  }
}
```

### Aggregations & Computed Fields

```javascript
// Count relationships
{
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" },
    overdueCount: { $count: "overdueLoans" },
    reservationCount: { $count: "reservations" }
  }
}

// Sum and average
{
  type: "patrons",
  select: {
    name: "name",
    totalLoans: { $count: "loans" },
    totalRenewals: { $sum: { $get: "loans.$.renewalCount" } },
    avgRenewalCount: { $avg: { $get: "loans.$.renewalCount" } }
  }
}

// Statistical aggregates
{
  type: "books",
  select: {
    title: "title",
    avgRating: { $avg: { $get: "reviews.$.rating" } },
    minCheckoutDays: { $min: { $get: "loans.$.checkoutDays" } },
    maxCheckoutDays: { $max: { $get: "loans.$.checkoutDays" } }
  }
}
```

### Complex Transformations

```javascript
// String concatenation
{
  type: "patrons",
  select: {
    fullName: {
      $join: [
        { $get: "firstName" },
        " ",
        { $get: "lastName" }
      ]
    },
    email: "email"
  }
}

// Conditional fields
{
  type: "loans",
  select: {
    title: "title",
    renewalCount: "renewalCount",
    status: {
      $case: {
        value: { $get: "status" },
        cases: [
          { when: "returned", then: "Returned" },
          { when: "overdue", then: "Overdue" }
        ],
        default: "Active"
      }
    },
    canRenew: {
      $if: {
        if: { $lt: [{ $get: "renewalCount" }, 3] },
        then: true,
        else: false
      }
    }
  }
}

// Math calculations
{
  type: "patrons",
  select: {
    name: "name",
    totalLoans: { $count: { $get: "loans" } },
    overdueCount: { $count: { $get: "overdueLoans" } },
    lateFeeBase: {
      $multiply: [
        { $count: { $get: "overdueLoans" } },
        5.00
      ]
    },
    processingFee: 2.50,
    totalFees: {
      $add: [
        { $multiply: [{ $count: { $get: "overdueLoans" } }, 5.00] },
        2.50
      ]
    }
  }
}
```

### Nested Resources & Subqueries

```javascript
// Patron with recent activity
{
  type: "patrons",
  id: "current-patron",
  select: {
    name: "name",
    email: "email",
    currentLoans: {
      where: { returned: false },
      order: { dueDate: "asc" },
      limit: 10,
      select: {
        dueDate: "dueDate",
        renewalCount: "renewalCount",
        book: {
          select: ["title", "isbn", { author: ["name"] }]
        }
      }
    },
    recentReservations: {
      order: { createdAt: "desc" },
      limit: 5,
      select: {
        createdAt: "createdAt",
        status: "status",
        book: {
          select: ["title", "isbn"]
        }
      }
    }
  }
}

// Patron dashboard summary
{
  type: "patrons",
  id: "current-patron",
  select: {
    profile: {
      name: "name",
      email: "email",
      libraryCard: "libraryCard"
    },
    stats: {
      totalLoans: { $count: "loans" },
      currentLoans: {
        $count: {
          $filter: [
            { $get: "loans" },
            { $eq: [{ $get: "returned" }, false] }
          ]
        }
      },
      totalReservations: { $count: "reservations" },
      totalRenewals: { $sum: { $get: "loans.$.renewalCount" } }
    },
    activity: {
      latestLoan: {
        select: ["dueDate", "renewalCount"],
        order: { createdAt: "desc" },
        limit: 1
      }
    }
  }
}

// Multi-level relationships
{
  type: "authors",
  select: {
    name: "name",
    books: {
      select: {
        title: "title",
        loans: {
          where: {
            returned: { $eq: false }
          },
          select: {
            dueDate: "dueDate",
            renewalCount: "renewalCount",
            patron: {
              select: ["name", "libraryCard"]
            }
          }
        }
      }
    }
  }
}
```

### Performance Patterns

```javascript
// Limit nested results to avoid huge payloads
{
  type: "patrons",
  select: {
    name: "name",
    loans: {
      limit: 10,  // Limit nested results
      select: ["dueDate"]
    }
  }
}

// Paginate at every level
{
  type: "authors",
  limit: 20,
  select: {
    name: "name",
    books: {
      limit: 10,
      order: { publishedYear: "desc" },
      select: {
        title: "title",
        loans: {
          limit: 5,
          order: { createdAt: "desc" },
          select: ["dueDate", "patron"]
        }
      }
    }
  }
}

// Select only needed fields
{
  type: "patrons",
  select: ["id", "name"],  // Not "select: '*'"
  limit: 100
}
```

### Common Mistakes

```javascript
// Trying to sort by computed field
{
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" }
  },
  order: { loanCount: "desc" }  // Error: loanCount is not an attribute
}

// Workaround: Sort in application code
const results = await store.query({
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" }
  }
});
results.sort((a, b) => b.loanCount - a.loanCount);

// Using aggregation in WHERE
{
  type: "patrons",
  where: {
    loans: { $count: { $gt: 5 } }  // Error: $count not available in WHERE
  }
}

// Workaround 1: Filter in SELECT, then in application
const patrons = await store.query({
  type: "patrons",
  select: {
    name: "name",
    loanCount: { $count: "loans" }
  }
});
const filtered = patrons.filter(p => p.loanCount > 5);

// Workaround 2: Use a group query (typically better than workaround 1)
const filteredWithAggregation = await store.query({
  type: "patrons",
  group: {
    by: "name",
    aggregates: { loanCount: { $count: null } },
    where: { loanCount: { $gt: 5 } }
  }
});


// Using both id and ids (ERROR)
{
  type: "patrons",
  id: "p1",
  ids: ["p2", "p3"]  // Mutually exclusive
}
```

---

## Related Documentation

- **[Query Guide](query.md)** - Tutorial-style introduction to queries
- **[Schema Guide](schema.md)** - Define resource types, attributes, and relationships
- **[Expression Reference](https://github.com/jakesower/json-expressions)** - Complete expression operator documentation
- **[Store Creation Guide](store-creation.md)** - Build custom stores using Core primitives
- **[API Reference](api.md)** - Full Core API documentation

---

**Questions or feedback?** [Open an issue](https://github.com/jakesower/spectragraph/issues)
