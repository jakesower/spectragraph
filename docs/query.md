# Query Language Guide

Data Prism queries are JSON objects that describe what data to fetch and how to transform it. This guide covers all query syntax, from basic field selection to complex expressions.

## Table of Contents

- [Basic Query Structure](#basic-query-structure)
- [Selection Syntax](#selection-syntax)
- [Filtering with Where Clauses](#filtering-with-where-clauses)
- [Sorting and Ordering](#sorting-and-ordering)
- [Pagination](#pagination)
- [Expressions](#expressions)
- [Relationship Traversal](#relationship-traversal)
- [Advanced Patterns](#advanced-patterns)

## Basic Query Structure

Every query must specify a resource `type` and what fields to `select`:

```javascript
{
  type: "users",            // Required: resource type from schema
  select: ["name", "email"] // Required: fields to return
}
```

Optional query parameters:

```javascript
{
  type: "users",
  id: "123",               // Optional: fetch single resource by ID
  select: ["name"],
  where: { active: true }, // Optional: filtering conditions
  order: { name: "asc" },  // Optional: sorting
  limit: 10,               // Optional: max results
  offset: 5                // Optional: skip results (pagination)
}
```

## Selection Syntax

Data Prism supports multiple ways to specify which fields to select:

### Array Syntax (Recommended)

```javascript
// Select specific fields
{
  type: "users",
  select: ["name", "email", "createdAt"]
}
```

### Object Syntax

```javascript
// Field aliasing
{
  type: "users",
  select: {
    userName: "name",        // Alias: key is output name, value is source field
    userEmail: "email",
    registered: "createdAt"
  }
}
```

### Mixed Syntax (Most Flexible)

```javascript
// Combine arrays and objects
{
  type: "users",
  select: [
    "name",                // Direct field
    "email",
    {
      fullName: { $concat: ["firstName", " ", "lastName"] }, // Expression
      posts: ["title"]     // Relationship with sub-selection
    }
  ]
}
```

### Wildcard Selection

```javascript
// Select all attributes
{
  type: "users",
  select: "*"
}

// Select all attributes plus computed fields
{
  type: "users",
  select: [
    "*",
    { postCount: { $count: "posts" } }
  ]
}
```

## Filtering with Where Clauses

### Basic Equality

```javascript
{
  type: "users",
  select: ["name"],
  where: {
    active: true,
    role: "admin"
  }
}
```

### Comparison Operators

```javascript
{
  type: "posts",
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
  type: "users",
  select: ["name"],
  where: {
    role: { $in: ["admin", "editor"] },     // In list
    status: { $nin: ["banned", "deleted"] } // Not in list
  }
}
```

### Logical Operators

```javascript
{
  type: "posts",
  select: ["title"],
  where: {
    $or: [
      { published: true },
      { author: "admin" }
    ]
  }
}

// Complex logic
{
  type: "users",
  select: ["name"],
  where: {
    $and: [
      { active: true },
      {
        $or: [
          { role: "admin" },
          { verified: true }
        ]
      }
    ]
  }
}

// Negation
{
  type: "posts",
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
  type: "posts",
  select: ["title"],
  order: { createdAt: "desc" }
}
```

### Multiple Field Sort

```javascript
{
  type: "users",
  select: ["name", "email"],
  order: [
    { role: "asc" },      // Primary sort
    { name: "asc" }       // Secondary sort
  ]
}
```

## Pagination

```javascript
{
  type: "posts",
  select: ["title"],
  order: { createdAt: "desc" },
  limit: 20,    // Max 20 results
  offset: 40    // Skip first 40 (page 3 if 20 per page)
}
```

## Expressions

Data Prism includes a powerful expression system for computations and transformations:

### Aggregations

```javascript
{
  type: "users",
  select: {
    name: "name",
    postCount: { $count: "posts" },
    avgRating: { $avg: "posts.$.rating" },
    totalViews: { $sum: "posts.$.viewCount" },
    maxViews: { $max: "posts.$.viewCount" },
    minViews: { $min: "posts.$.viewCount" }
  }
}
```

### Mathematical Operations

```javascript
{
  type: "products",
  select: {
    name: "name",
    price: "price",
    discountedPrice: { $multiply: ["price", 0.9] },
    tax: { $multiply: ["price", 0.08] },
    total: {
      $add: [
        { $multiply: ["price", 0.9] },  // Discounted price
        { $multiply: ["price", 0.08] }  // Tax
      ]
    }
  }
}
```

### String Operations

```javascript
{
  type: "users",
  select: {
    fullName: { $concat: ["firstName", " ", "lastName"] },
    initials: { $concat: [
      { $substring: ["firstName", 0, 1] },
      { $substring: ["lastName", 0, 1] }
    ]},
    emailDomain: { $split: ["email", "@", 1] }
  }
}
```

### Conditionals

```javascript
{
  type: "users",
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
        value: "points",
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
  type: "users",
  select: [
    "name",
    {
      posts: ["title", "createdAt"]  // One-to-many relationship
    }
  ]
}
```

### Nested Relationships

```javascript
{
  type: "users",
  select: [
    "name",
    {
      posts: [
        "title",
        {
          comments: [      // Posts -> Comments (nested relationship)
            "content",
            {
              author: ["name"]  // Comments -> Author (three levels deep)
            }
          ]
        }
      ]
    }
  ]
}
```

### Relationship Filtering

```javascript
{
  type: "users",
  select: [
    "name",
    {
      posts: {
        select: ["title"],
        where: { published: true },  // Only published posts
        order: { createdAt: "desc" },
        limit: 5
      }
    }
  ]
}
```

### Cross-Relationship Expressions

```javascript
{
  type: "users",
  select: {
    name: "name",
    // Aggregate across relationships using dot paths
    avgPostRating: { $avg: "posts.$.rating" },
    totalComments: { $count: "posts.$.comments" },
    topCommentRating: { $max: "posts.$.comments.$.rating" }
  }
}
```

## Advanced Patterns

### Dynamic Field Selection

```javascript
// Build queries programmatically
const fields = ["name", "email"];
const includeStats = true;

const query = {
	type: "users",
	select: [
		...fields,
		...(includeStats
			? [
					{
						postCount: { $count: "posts" },
						avgRating: { $avg: "posts.$.rating" },
					},
				]
			: []),
	],
};
```

### Computed Analytics

```javascript
{
  type: "companies",
  select: {
    name: "name",
    employeeCount: { $count: "employees" },
    avgSalary: { $avg: "employees.$.salary" },
    payrollTotal: { $sum: "employees.$.salary" },
    topPerformers: {
      $filter: [
        "employees",
        { performance: { $gte: 4.0 } }
      ]
    },
    departmentStats: {
      $groupBy: [
        "employees",
        "department",
        {
          count: { $count: {} },
          avgSalary: { $avg: "salary" }
        }
      ]
    }
  }
}
```

### Complex Business Logic

```javascript
{
  type: "orders",
  select: {
    orderNumber: "orderNumber",
    subtotal: { $sum: "items.$.price" },
    discount: {
      $if: {
        if: { $gt: [{ $sum: "items.$.price" }, 100] },
        then: { $multiply: [{ $sum: "items.$.price" }, 0.1] },
        else: 0
      }
    },
    shipping: {
      $case: {
        value: "shippingMethod",
        cases: [
          { when: "express", then: 15.99 },
          { when: "standard", then: 5.99 }
        ],
        default: 0
      }
    },
    total: {
      $add: [
        { $sum: "items.$.price" },           // Subtotal
        { $multiply: [                        // Tax
          { $sum: "items.$.price" },
          0.08
        ]},
        "shippingCost"                       // Shipping
      ]
    }
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
// ❌ Wrong: Missing required fields
{
  select: ["name"]  // Missing 'type'
}

// ✅ Correct
{
  type: "users",
  select: ["name"]
}

// ❌ Wrong: Invalid attribute reference
{
  type: "users",
  select: ["nonexistentField"]
}

// ✅ Correct: Check your schema for valid attribute names
{
  type: "users",
  select: ["name"]  // 'name' exists in schema
}

// ❌ Wrong: Invalid relationship syntax
{
  type: "users",
  select: {
    posts: "title"  // Should be array or object with select
  }
}

// ✅ Correct
{
  type: "users",
  select: {
    posts: ["title"]  // Array syntax
  }
}
```

For complete expression reference, see [expressions.md](expressions.md).
For schema definition guide, see [schema.md](schema.md).
