# Expression Reference Guide

SpectraGraph expressions provide powerful data transformation, computation, and aggregation capabilities within queries. Expressions are JSON objects that start with `$` and can be used in `select` fields, `where` clauses, and `order` specifications.

## Table of Contents

- [Expression Basics](#expression-basics)
- [Expression Engines](#expression-engines)
- [JSON Expressions Library](#json-expressions-library)
- [Available Expressions](#available-expressions)
- [Usage Examples](#usage-examples)
- [Store-Specific Behavior](#store-specific-behavior)

## Expression Basics

### Syntax

All expressions are JSON objects with keys starting with `$`:

```javascript
{
  type: "users",
  select: {
    name: "name",
    uppercaseName: { $uppercase: "name" },    // Expression
    postCount: { $count: "posts" }           // Another expression
  }
}
```

### Expression Context

Expressions evaluate within the context of the current resource:

- Field references like `"name"` refer to attributes of the current resource
- Relationship paths like `"posts.$.title"` traverse to related resources
- Dot notation like `"address.city"` accesses nested object properties

## Expression Engines

SpectraGraph uses expression engines to evaluate expressions in different contexts. Each engine supports a specific set of expressions optimized for their use case.

### defaultSelectEngine

The default expression engine for SELECT clauses supports filtering, aggregation, transformation, and projection operations.

**Available expressions:** `$and`, `$case`, `$concat`, `$count`, `$debug`, `$distinct`, `$eq`, `$filter`, `$flatMap`, `$get`, `$gt`, `$gte`, `$if`, `$in`, `$isPresent`, `$isNotNull`, `$isNull`, `$join`, `$literal`, `$lowercase`, `$lt`, `$lte`, `$map`, `$matchesGlob`, `$matchesLike`, `$matchesRegex`, `$max`, `$mean`, `$min`, `$ne`, `$nin`, `$not`, `$or`, `$pipe`, `$prop`, `$substring`, `$sum`, `$uppercase`

**JSON Expressions packs:** `filtering` + `projection`

### defaultWhereEngine

The default expression engine for WHERE clauses supports filtering and logic operations only (no aggregation or transformation).

**Available expressions:** `$and`, `$debug`, `$eq`, `$filter`, `$get`, `$gt`, `$gte`, `$if`, `$in`, `$isPresent`, `$isNotNull`, `$isNull`, `$literal`, `$lt`, `$lte`, `$map`, `$matchesGlob`, `$matchesLike`, `$matchesRegex`, `$ne`, `$nin`, `$not`, `$or`, `$pipe`, `$prop`

**JSON Expressions packs:** `filtering`

### Custom Expression Engines

You can create custom expression engines with different capabilities:

```javascript
import {
  createExpressionEngine,
  filtering,
  projection,
} from "json-expressions";

// Custom engine with only basic operations
const basicEngine = createExpressionEngine({
  packs: [filtering],
});

// Use in store configuration
const store = createMemoryStore(schema, {
  selectEngine: basicEngine,
  whereEngine: basicEngine,
});
```

## JSON Expressions Library

SpectraGraph expressions are powered by the [json-expressions](https://github.com/jakesower/json-expressions) library. This library provides a comprehensive set of expressions organized into packs:

### Expression Packs Used

- **filtering**: Comparison, logical, and pattern matching expressions
- **projection**: Aggregation, transformation, and collection operations

Each pack can be imported and used independently:

```javascript
import {
  createExpressionEngine,
  filtering,
  projection,
} from "json-expressions";

const customSelectEngine = createExpressionEngine({
  packs: [filtering, projection],
});
```

SpectraGraph provides widely applicable expressions by default. Exploring the various packs can bring powerful functionality geared toward your particular application.

For detailed documentation on individual expressions, see the [json-expressions documentation](https://github.com/jakesower/json-expressions).

## Available Expressions

### Comparison Expressions

**Available in:** SELECT, WHERE

- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array

```javascript
{
  type: "products",
  select: ["name", "price"],
  where: {
    price: { $gte: 10 },
    category: { $in: ["electronics", "books"] }
  }
}
```

### Logical Expressions

**Available in:** SELECT, WHERE

- `$and` - Logical AND
- `$or` - Logical OR
- `$not` - Logical NOT

```javascript
{
  type: "users",
  select: ["name"],
  where: {
    $and: [
      { active: true },
      { $or: [{ role: "admin" }, { verified: true }] }
    ]
  }
}
```

### Pattern Matching

**Available in:** SELECT, WHERE

- `$matchesRegex` - Regular expression matching
- `$matchesLike` - SQL LIKE pattern matching (store-dependent)
- `$matchesGlob` - Glob pattern matching (store-dependent)

```javascript
{
  type: "users",
  select: ["name", "email"],
  where: {
    email: { $matchesRegex: ".*@gmail\\.com$" }
  }
}
```

### Aggregation Expressions

**Available in:** SELECT only

- `$count` - Count items
- `$sum` - Sum numeric values
- `$min` - Minimum value
- `$max` - Maximum value
- `$mean` - Average value

```javascript
{
  type: "users",
  select: {
    name: "name",
    postCount: { $count: "posts" },
    avgRating: { $mean: "posts.$.rating" }
  }
}
```

### Collection Operations

**Available in:** SELECT only

- `$map` - Transform each item
- `$filter` - Filter items by condition
- `$flatMap` - Map and flatten
- `$distinct` - Remove duplicates
- `$concat` - Concatenate arrays/strings
- `$join` - Join array elements into string

```javascript
{
  type: "users",
  select: {
    name: "name",
    publishedPosts: { $filter: ["posts", { status: "published" }] },
    tagNames: { $map: ["posts.$.tags", "name"] }
  }
}
```

### String Operations

**Available in:** SELECT only

- `$uppercase` - Convert to uppercase
- `$lowercase` - Convert to lowercase
- `$substring` - Extract substring
- `$concat` - Concatenate strings

```javascript
{
  type: "users",
  select: {
    name: "name",
    upperName: { $uppercase: "name" },
    initials: { $substring: ["name", 0, 2] }
  }
}
```

### Conditional Logic

**Available in:** SELECT, WHERE

- `$if` - If-then-else logic
- `$case` - Multi-condition switch

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
          { when: { $gte: 1000 }, then: "Premium" },
          { when: { $gte: 100 }, then: "Standard" }
        ],
        default: "Basic"
      }
    }
  }
}
```

### Utility Expressions

**Available in:** SELECT, WHERE

- `$get` - Access nested properties
- `$prop` - Dynamic property access
- `$literal` - Return literal value
- `$isPresent` - Check if value is defined
- `$isNull` - Check if value is null
- `$isNotNull` - Check if value is not null

```javascript
{
  type: "users",
  select: {
    name: "name",
    city: { $get: "address.city" },
    hasPhone: { $isPresent: "phoneNumber" }
  }
}
```

## Usage Examples

### Aggregation with Filtering

```javascript
{
  type: "orders",
  select: {
    orderNumber: "orderNumber",
    expensiveItems: {
      $filter: ["items", { $gt: ["price", 100] }]
    },
  }
}
```

## Store-Specific Behavior

### Expression Evaluation Location

Different stores evaluate expressions differently in actual execution, but the result remains the same. This may result in poor performance depending on the store and how expressions are executed with in it.

### Store Capabilities

**Limited in Some Stores:**

- Regular expressions conform to PCRE (Perl Compatible Regular Expression) semantics
- Complex nested aggregations may fall back to JavaScript
- Performance characteristics vary significantly

For complete query syntax including expressions, see [query.md](query.md).
For schema definitions that support expressions, see [schema.md](schema.md).
