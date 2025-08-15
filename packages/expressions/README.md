# Data Prism Expressions

A JavaScript expression engine for enhancing Data Prism queries with computed values and conditional logic. Data Prism Expressions provides a JSON-based syntax for creating dynamic where clauses and calculated select fields, extending the core querying capabilities with lightweight programmatic logic.

## Overview

Data Prism Expressions is built around several key principles:

- **Query enhancement**: Adds computed fields and conditional logic to Data Prism queries
- **Extensible**: Built for users to extend with custom expressions and operations
- **Lightweight**: Focuses on the most common expressions needed in data queries
- **JSON-native**: Uses JSON objects that can be serialized and stored

## Installation

```bash
npm install @data-prism/expressions
```

## Core Concepts

### Expressions

Expressions are JSON objects that describe computations to be performed on data. Each expression has a single key that identifies the operation (prefixed with `$`) and a value that provides the parameters:

```javascript
// Simple comparison
{ "$gt": [{ "$get": "age" }, 18] }

// Logical operations
{ "$and": [
  { "$gt": [{ "$get": "score" }, 80] },
  { "$lt": [{ "$get": "attempts" }, 5] }
]}

// Conditional logic
{ "$if": {
  condition: { "$eq": [{ "$get": "status" }, "active"] },
  then: { "$get": "fullName" },
  else: "Inactive User"
}}
```

### Expression Engine

The expression engine compiles and evaluates expressions against data:

```javascript
import { defaultExpressionEngine } from '@data-prism/expressions';

const expression = { "$gt": [{ "$get": "age" }, 21] };
const data = { name: "John", age: 25 };

const result = defaultExpressionEngine.apply(expression, data);
// Returns: true
```

## API Reference

### Core Functions

#### `createExpressionEngine(definitions)`

Creates a custom expression engine with additional operation definitions.

**Parameters:**

- `definitions` (object) - Custom operation definitions to add to the engine

**Returns:** ExpressionEngine with core + custom operations

```javascript
import { createExpressionEngine } from '@data-prism/expressions';

const customEngine = createExpressionEngine({
  $customOp: {
    apply: (params, data) => {
      // Custom operation logic
      return params[0] + params[1];
    }
  }
});
```

#### `defaultExpressionEngine`

Pre-configured expression engine with all built-in operations.

```javascript
import { defaultExpressionEngine } from '@data-prism/expressions';

const result = defaultExpressionEngine.apply(expression, data);
```

### ExpressionEngine Methods

#### `apply(expression, data)`

Evaluates an expression against input data.

**Parameters:**

- `expression` (Expression) - The expression to evaluate
- `data` (any) - The data context for evaluation

**Returns:** Result of the expression evaluation

```javascript
const expression = { "$sum": [{ "$get": "price" }, 10] };
const data = { price: 100 };

const result = engine.apply(expression, data);
// Returns: 110
```

#### `compile(expression)`

Compiles an expression into a reusable function.

**Parameters:**

- `expression` (Expression) - The expression to compile

**Returns:** Function that takes data and returns the evaluation result

```javascript
const expression = { "$gt": [{ "$get": "age" }, 18] };
const compiledFn = engine.compile(expression);

const result1 = compiledFn({ age: 25 }); // true
const result2 = compiledFn({ age: 16 }); // false
```

#### `evaluate(expression)`

Evaluates an expression without input data (for static expressions).

**Parameters:**

- `expression` (Expression) - The expression to evaluate

**Returns:** Static result of the expression

```javascript
const expression = { "$sum": [10, 20] };
const result = engine.evaluate(expression);
// Returns: 30
```

#### `isExpression(value)`

Tests whether a value is a valid expression.

**Parameters:**

- `value` (any) - The value to test

**Returns:** Boolean indicating if the value is an expression

```javascript
const isExpr1 = engine.isExpression({ "$get": "name" }); // true
const isExpr2 = engine.isExpression({ name: "John" }); // false
```

## Built-in Operations

### Core Operations

#### `$get`
Retrieves a value from the data object using lodash-style path notation.

```javascript
{ "$get": "name" }          // Gets data.name
{ "$get": "user.age" }      // Gets data.user.age (nested path)
```

#### `$literal`
Returns a literal value (useful when you need to pass a value that might be confused with an expression).

```javascript
{ "$literal": { "$get": "not-an-expression" } }
```

#### `$echo`
Returns the input data unchanged (identity function).

```javascript
{ "$echo": null } // Returns the entire input data object
```

#### `$isDefined`
Tests whether the input data is defined (not undefined).

```javascript
{ "$isDefined": null } // Returns true if data !== undefined
```

#### `$if`
Conditional expression that evaluates different branches based on a condition.

```javascript
{ "$if": {
  condition: { "$gt": [{ "$get": "age" }, 18] },
  then: "Adult",
  else: "Minor"
}}
```

#### `$compose`
Chains multiple expressions together, passing the output of each as input to the next.

```javascript
{ "$compose": [
  { "$get": "users" },
  { "$filter": { "$gt": [{ "$get": "age" }, 18] } },
  { "$map": { "$get": "name" } }
]}
```

#### `$debug`
Logs the input data to console and returns it unchanged (useful for debugging).

```javascript
{ "$debug": null } // Logs data to console, returns data
```

#### `$ensurePath`
Validates that a path exists in the data, throwing an error if not found.

```javascript
{ "$ensurePath": "user.profile.email" } // Throws if path doesn't exist
```

### Logical Operations

#### `$and`
Logical AND operation - all expressions must be truthy.

```javascript
{ "$and": [
  { "$gt": [{ "$get": "age" }, 18] },
  { "$eq": [{ "$get": "status" }, "active"] }
]}
```

#### `$or`
Logical OR operation - at least one expression must be truthy.

```javascript
{ "$or": [
  { "$eq": [{ "$get": "role" }, "admin"] },
  { "$eq": [{ "$get": "role" }, "moderator"] }
]}
```

#### `$not`
Logical NOT operation - inverts the truthiness of an expression.

```javascript
{ "$not": { "$eq": [{ "$get": "deleted" }, true] } }
```

### Comparison Operations

All comparison operations use mathematical abbreviations for consistency and brevity.

#### `$eq` / `$ne`
Equality and inequality comparisons using deep equality.

```javascript
{ "$eq": [{ "$get": "status" }, "published"] }
{ "$ne": [{ "$get": "type" }, "draft"] }
```

#### `$lt` / `$lte` / `$gt` / `$gte`
Numeric comparisons (less than, less than or equal, greater than, greater than or equal).

```javascript
{ "$gt": [{ "$get": "score" }, 90] }
{ "$lte": [{ "$get": "attempts" }, 3] }
```

#### `$in` / `$nin`
Array membership tests (in / not in).

```javascript
{ "$in": [{ "$get": "category" }, ["tech", "science", "math"]] }
{ "$nin": [{ "$get": "status" }, ["deleted", "archived"]] }
```

### Aggregative Operations

#### `$sum`
Sum of array values.

```javascript
{ "$sum": { "$get": "scores" } }
```

#### `$min` / `$max`
Minimum/maximum of array values.

```javascript
{ "$max": { "$get": "temperatures" } }
{ "$min": { "$get": "prices" } }
```

#### `$count`
Count of items in an array.

```javascript
{ "$count": { "$get": "items" } }
```

### Iterative Operations

#### `$map`
Transform each item in an array.

```javascript
{ "$map": [
  { "$get": "items" },
  { "$get": "name" }
]}
```

#### `$filter`
Filter array items based on a condition.

```javascript
{ "$filter": [
  { "$get": "products" },
  { "$gt": [{ "$get": "price" }, 50] }
]}
```

#### `$flatMap`
Transform and flatten array items.

```javascript
{ "$flatMap": [
  { "$get": "categories" },
  { "$get": "products" }
]}
```

## Examples

### Basic Usage

```javascript
import { defaultExpressionEngine } from '@data-prism/expressions';

const data = {
  user: { name: "Alice", age: 30 },
  orders: [
    { id: 1, amount: 50 },
    { id: 2, amount: 75 },
    { id: 3, amount: 120 }
  ]
};

// Check if user is adult
const isAdult = defaultExpressionEngine.apply(
  { "$gte": [{ "$get": "user.age" }, 18] },
  data
);
// Returns: true

// Calculate total order amount
const totalAmount = defaultExpressionEngine.apply(
  { "$sum": { "$map": [
    { "$get": "orders" },
    { "$get": "amount" }
  ]}},
  data
);
// Returns: 245
```

### Query Enhancement

```javascript
// In a Data Prism query
const query = {
  type: "products",
  where: {
    "$and": [
      { "$gte": [{ "$get": "price" }, 10] },
      { "$lte": [{ "$get": "price" }, 100] },
      { "$eq": [{ "$get": "inStock" }, true] }
    ]
  },
  select: {
    name: "name",
    price: "price",
    priceWithTax: { "$sum": [{ "$get": "price" }, { "$get": "tax" }] },
    category: "category"
  }
};
```

### Custom Operations

```javascript
import { createExpressionEngine, defaultExpressions } from '@data-prism/expressions';

const customEngine = createExpressionEngine({
  ...defaultExpressions,
  
  // Custom string operation
  $titleCase: {
    apply: (str) => {
      return str.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  },
  
  // Custom validation operation
  $isValidEmail: {
    apply: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
  }
});

// Use custom operations
const result = customEngine.apply(
  { "$titleCase": { "$get": "fullName" } },
  { fullName: "john doe" }
);
// Returns: "John Doe"
```

### Compiled Expressions for Performance

```javascript
import { defaultExpressionEngine } from '@data-prism/expressions';

// Compile once, use many times
const calculateDiscountPrice = defaultExpressionEngine.compile({
  "$if": {
    condition: { "$gt": [{ "$get": "discountPercent" }, 0] },
    then: { "$sum": [
      { "$get": "price" },
      { "$sum": [{ "$get": "price" }, { "$get": "discountPercent" }] }
    ]},
    else: { "$get": "price" }
  }
});

// Use compiled function repeatedly
const products = [
  { name: "Laptop", price: 1000, discountPercent: -100 },
  { name: "Mouse", price: 50, discountPercent: -2.5 },
  { name: "Keyboard", price: 100, discountPercent: 0 }
];

const discountedPrices = products.map(calculateDiscountPrice);
// Returns: [900, 47.5, 100]
```

## Integration with Data Prism Core

Expressions work seamlessly with Data Prism queries:

```javascript
import { defaultExpressionEngine } from '@data-prism/expressions';
import { queryGraph } from '@data-prism/core';

const query = {
  type: "users",
  where: {
    "$and": [
      { "$gte": [{ "$get": "age" }, 21] },
      { "$eq": [{ "$get": "status" }, "active"] }
    ]
  },
  select: {
    name: "name",
    isAdult: { "$gte": [{ "$get": "age" }, 18] },
    ageGroup: {
      "$if": {
        condition: { "$lt": [{ "$get": "age" }, 30] },
        then: "young",
        else: {
          "$if": {
            condition: { "$lt": [{ "$get": "age" }, 50] },
            then: "middle",
            else: "senior"
          }
        }
      }
    }
  }
};

// Use with expression engine in query options
const results = queryGraph(schema, query, graph, {
  expressionEngine: defaultExpressionEngine
});
```

## Related Packages

- `@data-prism/core` - Core schema and querying functionality
- `@data-prism/memory-store` - In-memory data store with expression support
- `@data-prism/postgres-store` - PostgreSQL backend with SQL expression compilation