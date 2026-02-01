# Query Language Guide

SpectraGraph queries are JSON objects that describe what data to fetch and how to transform it. This guide covers all query syntax, from basic field selection to complex expressions.

## Table of Contents

- [Basic Query Structure](#basic-query-structure)
- [Selection Syntax](#selection-syntax)
- [Filtering with Where Clauses](#filtering-with-where-clauses)
- [Sorting and Ordering](#sorting-and-ordering)
- [Pagination](#pagination)
- [Grouping and Aggregation](#grouping-and-aggregation)
- [Expressions](#expressions)
- [Relationship Traversal](#relationship-traversal)
- [Advanced Patterns](#advanced-patterns)

## Basic Query Structure

Every query must specify a resource `type` and what fields to `select`:

```javascript
{
  type: "patrons",            // Required: resource type from schema
  select: ["name", "email"] // Required: fields to return
}
```

Optional query parameters:

```javascript
{
  type: "patrons",
  id: "123",               // Optional: fetch single resource by ID
  select: ["name"],
  where: { active: true }, // Optional: filtering conditions
  order: { name: "asc" },  // Optional: sorting
  slice: { limit: 10, offset: 5 }  // Optional: pagination
}
```

## Selection Syntax

SpectraGraph supports multiple ways to specify which fields to select:

### Array Syntax (Recommended)

```javascript
// Select specific fields
{
  type: "patrons",
  select: ["name", "email", "createdAt"]
}
```

### Object Syntax

```javascript
// Field aliasing
{
  type: "patrons",
  select: {
    patronName: "name",        // Alias: key is output name, value is source field
    patronEmail: "email",
    registered: "createdAt"
  }
}
```

### Mixed Syntax (Also Recommended)

```javascript
// Combine arrays and objects
{
  type: "patrons",
  select: [
    "name",                // Direct fields
    "email",
    {
      fullName: { $concat: [{ $get: "firstName" }, " ", { $get: "lastName" }] }, // Expression
      loans:  {
        select: ["title"], // Relationship with sub-selection, requires explicit select since it also uses slice
        slice: { limit: 10 },
      }
    }
  ]
}
```

### Wildcard Selection

```javascript
// Select all attributes
{ type: "patrons", select: "*" }

// Select all attributes plus computed fields
{
  type: "patrons",
  select: [
    "*",
    { loanCount: { $count: { $get: "loans" } } }
  ]
}
```

## Filtering with Where Clauses

### Basic Equality

```javascript
{
  type: "patrons",
  select: ["name"],
  where: {
    active: true, // default to equality
    membershipType: "premium"
  }
}
```

### Comparison Operators

```javascript
{
  type: "loans",
  select: ["title"],
  where: {
    viewCount: { $gt: 100 },           // Greater than
    createdAt: { $gte: "2024-01-01" }, // Greater than or equal
    rating: { $lt: 3 },                // Less than
    priority: { $lte: 5 },             // Less than or equal
    status: { $ne: "draft" }           // Not equal
  }
}
```

### List Operators

```javascript
{
  type: "patrons",
  select: ["name"],
  where: {
    membershipType: ["premium", "standard"],              // Array shorthand for $in
    status: { $nin: ["banned", "deleted"] } // Not in list
  }
}

// Explicit $in (same as array shorthand)
{
  type: "patrons",
  select: ["name"],
  where: {
    membershipType: { $in: ["premium", "standard"] }
  }
}

// For exact array equality (rare), use $literal
{
  type: "patrons",
  select: ["name"],
  where: {
    tags: { $literal: ["javascript", "node"] } // Exact array match
  }
}
```

### Logical Operators

```javascript
{
  type: "loans",
  select: ["title"],
  where: {
    $or: [
      { published: true },
      { author: "premium" }
    ]
  }
}

// Complex logic
{
  type: "patrons",
  select: ["name"],
  where: {
    $and: [
      { active: true },
      {
        $or: [
          { membershipType: "premium" },
          { verified: true }
        ]
      }
    ]
  }
}

// Negation
{
  type: "loans",
  select: ["title"],
  where: {
    $not: { status: "draft" }
  }
}
```

## Sorting and Ordering

### Single Field Sort

```javascript
{
  type: "loans",
  select: ["title"],
  order: { createdAt: "desc" }
}
```

### Multiple Field Sort

```javascript
{
  type: "patrons",
  select: ["name", "email"],
  order: [
    { membershipType: "asc" },      // Primary sort
    { name: "asc" }       // Secondary sort
  ]
}
```

Note: The array form is consistent with JSON semantics. JavaScript honors the order of keys in an object, but JSON does not.

## Pagination

```javascript
{
  type: "loans",
  select: ["title"],
  order: { createdAt: "desc" },
  slice: {
    limit: 20,    // Max 20 results
    offset: 40    // Skip first 40 (page 3 if 20 per page)
  }
}
```

## Grouping and Aggregation

SpectraGraph supports grouping resources and computing aggregates, similar to SQL's GROUP BY functionality. Queries use either `select` (for regular queries) OR `group` (for aggregation queries), but not both at the top level.

### Basic Grouping

Group resources by one or more attributes:

```javascript
// Group by single field
{
  type: "books",
  group: {
    by: "genre"
  }
}
// Returns: [{ genre: "fiction" }, { genre: "nonfiction" }, { genre: "science" }]

// Group by multiple fields
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
```

### Aggregates

Compute aggregate values for each group:

```javascript
// Count records per group
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      total: { $count: null }
    }
  }
}
// Returns: [
//   { genre: "fiction", total: 150 },
//   { genre: "nonfiction", total: 200 },
//   ...
// ]

// Sum values
{
  type: "loans",
  group: {
    by: "status",
    aggregates: {
      totalFines: { $sum: { $pluck: "fineAmount" } }
    }
  }
}

// Multiple aggregates
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null },
      avgPages: { $mean: { $pluck: "pageCount" } },
      newestYear: { $max: { $pluck: "publishedYear" } },
      oldestYear: { $min: { $pluck: "publishedYear" } }
    }
  }
}
```

### Select in Groups

Control output fields and add computed fields:

```javascript
// Rename fields
{
  type: "books",
  group: {
    by: "genre",
    select: { category: "genre" }  // Rename genre to category
  }
}

// Computed fields
{
  type: "books",
  group: {
    by: "pageCount",
    select: [
      "pageCount",
      {
        size: {
          $if: {
            if: { $gte: [{ $get: "pageCount" }, 400] },
            then: "large",
            else: "standard"
          }
        }
      }
    ]
  }
}

// Mix of by fields, computed fields, and aggregates
{
  type: "loans",
  group: {
    by: ["status", "patronId"],
    select: {
      loanStatus: "status",
      patron: "patronId"
    },
    aggregates: {
      count: { $count: null },
      totalFines: { $sum: { $pluck: "fineAmount" } }
    }
  }
}
```

### Filtering Groups (HAVING)

Use `where` on groups to filter after aggregation:

```javascript
// Only show genres with > 100 books
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    },
    where: { $gt: [{ $get: "count" }, 100] }
  }
}

// Complex filtering on aggregates
{
  type: "loans",
  group: {
    by: "patronId",
    aggregates: {
      totalFines: { $sum: { $pluck: "fineAmount" } },
      loanCount: { $count: null }
    },
    where: {
      $and: [
        { $gt: [{ $get: "totalFines" }, 20] },
        { $gte: [{ $get: "loanCount" }, 3] }
      ]
    }
  }
}
```

### Ordering, Limiting Groups

Groups support the same ordering and pagination as regular queries:

```javascript
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      avgPages: { $mean: { $pluck: "pageCount" } }
    },
    order: { avgPages: "desc" },  // Order by aggregate
    slice: { limit: 10 }
  }
}

// Sort by multiple fields
{
  type: "books",
  group: {
    by: ["genre", "publishedYear"],
    aggregates: {
      count: { $count: null }
    },
    order: [
      { genre: "asc" },
      { count: "desc" }
    ]
  }
}
```

### Nested Grouping

Create multi-level aggregations by nesting group clauses:

```javascript
// Group by genre, compute size category based on average pages, then regroup by size
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      avgPages: { $mean: { $pluck: "pageCount" } }
    },
    select: [
      "genre",
      "avgPages",
      {
        size: {
          $if: {
            if: { $gte: [{ $get: "avgPages" }, 400] },
            then: "long",
            else: "short"
          }
        }
      }
    ],
    group: {
      by: "size",
      aggregates: {
        genreCount: { $count: null },
        totalAvgPages: { $sum: { $pluck: "avgPages" } }
      }
    }
  }
}
// Returns: [
//   { size: "long", genreCount: 2, totalAvgPages: 950 },
//   { size: "short", genreCount: 3, totalAvgPages: 800 }
// ]
```

### Top-Level WHERE vs Group WHERE

Important distinction:

```javascript
// Top-level WHERE filters BEFORE grouping (like SQL WHERE)
{
  type: "books",
  where: { publishedYear: { $gte: 2020 } },  // Filter books first
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    }
  }
}

// Group WHERE filters AFTER grouping (like SQL HAVING)
{
  type: "books",
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    },
    where: { $gt: [{ $get: "count" }, 50] }  // Filter groups
  }
}

// Both together
{
  type: "books",
  where: { publishedYear: { $gte: 2020 } },  // First: filter books
  group: {
    by: "genre",
    aggregates: {
      count: { $count: null }
    },
    where: { $gt: [{ $get: "count" }, 50] }  // Then: filter groups
  }
}
```

## Expressions

SpectraGraph includes a powerful expression system for computations and transformations:

### Computed Fields

```javascript
{
  type: "books",
  select: {
    title: "title",
    pageCount: "pageCount",
    isLongBook: { $gt: [{ $get: "pageCount" }, 400] },
    readingLevel: {
      $case: {
        value: { $get: "pageCount" },
        cases: [
          { when: { $gte: 500 }, then: "Advanced" },
          { when: { $gte: 250 }, then: "Intermediate" }
        ],
        default: "Beginner"
      }
    }
  }
}
```

### String Operations

```javascript
{
  type: "patrons",
  select: {
    fullName: { $concat: [{ $get: "firstName" }, " ", { $get: "lastName" }] },
    upperName: { $uppercase: { $get: "name" } },
    lowerEmail: { $lowercase: { $get: "email" } },
  }
}
```

### Conditionals

```javascript
{
  type: "patrons",
  select: {
    name: "name",
    status: {
      $if: {
        if: { active: true },
        then: "Active",
        else: "Inactive"
      }
    },
    tier: {
      $case: {
        value: { $get: "points" },
        cases: [
          { when: { $gte: 1000 }, then: "Gold" },
          { when: { $gte: 500 }, then: "Silver" }
        ],
        default: "Bronze"
      }
    }
  }
}
```

## Relationship Traversal

### Basic Relationships

```javascript
{
  type: "patrons",
  select: ["name", {
    loans: ["title", "createdAt"]  // One-to-many relationship
  }]
}
```

### Nested Relationships

```javascript
{
  type: "patrons",
  select: ["name", {
    loans: ["title", {
      reviews: [      // Loans -> Reviews (nested relationship)
        "content",
        {
          author: ["name"]  // Reviews -> Author (three levels deep)
        }
      ]
    }]
  }]
}
```

### Relationship Filtering

```javascript
{
  type: "patrons",
  select: ["name", {
    loans: {
      select: ["title"],
      where: { status: "active" },  // Only active loans
      order: { createdAt: "desc" },
      slice: { limit: 5 }
    }
  }]
}
```

## Advanced Patterns

### Dynamic Field Selection

```javascript
// Build queries programmatically
const fields = ["name", "email"];
const includeStats = true;

const query = {
  type: "patrons",
  select: [
    ...fields,
    ...(includeStats
      ? [
          {
            loanCount: { $count: { $get: "loans" } },
            avgRating: { $mean: { $get: "loans" } },
          },
        ]
      : []),
  ],
};
```

### Business Logic

```javascript
{
  type: "loans",
  select: {
    loanId: "loanId",
    isOverdue: { $eq: [{ $get: "status" }, "overdue"] },
    displayStatus: {
      $case: {
        value: { $get: "status" },
        cases: [
          { when: "active", then: "Currently Borrowed" },
          { when: "returned", then: "Returned" },
          { when: "overdue", then: "Please Return" }
        ],
        default: "Unknown"
      }
    },
    hasLargeFine: { $gt: [{ $get: "fineAmount" }, 10] }
  }
}
```

### Performance Optimization Tips

1. **Select only needed fields** - Don't use `"*"` unless you need all attributes
2. **Filter early** - Apply `where` clauses to reduce data before processing
3. **Limit relationship depth** - Deep nesting can impact performance
4. **Use pagination** - Always include `limit` for potentially large result sets
5. **Consider store capabilities** - Some expressions are optimized per store type

### Error Handling

Common validation errors and how to fix them:

```javascript
// Wrong: Missing required fields
{
  select: ["name"]  // Missing 'type'
}

// Correct
{
  type: "patrons",
  select: ["name"]
}

// Wrong: Invalid attribute reference
{
  type: "patrons",
  select: ["nonexistentField"]
}

// Correct: Check your schema for valid attribute names
{
  type: "patrons",
  select: ["name"]  // 'name' exists in schema
}

// Wrong: Invalid relationship syntax
{
  type: "patrons",
  select: {
    loans: "title"  // Should be array or object with select
  }
}

// Correct
{
  type: "patrons",
  select: {
    loans: ["title"]  // Array syntax
  }
}
```

For complete expression reference, see the [json-expressions documentation](https://github.com/jakesower/json-expressions/blob/main/docs/expressions.md).
For schema definition guide, see [schema.md](schema.md).
