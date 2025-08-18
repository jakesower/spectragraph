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

```json
// Simple comparison
{ "$gt": 18 }  // arg > 18

// Logical operations
{ "$and": [
  { "$gt": 80 },
  { "$lt": 5 }
]}

// Conditional logic
{ "$if": {
  "if": { "$eq": "active" },
  "then": { "$get": "fullName" },
  "else": "Inactive User"
}}
```

### Expression Engine

The expression engine compiles and evaluates expressions against data:

```javascript
import { defaultExpressionEngine } from "@data-prism/expressions";

const expression = { $gt: 21 };
const data = 25;

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
import { createExpressionEngine } from "@data-prism/expressions";

const customEngine = createExpressionEngine({
	$customOp: {
		apply: (params, data) => {
			// Custom operation logic
			return params + data;
		},
	},
});
```

#### `defaultExpressionEngine`

Pre-configured expression engine with all built-in operations.

```javascript
import { defaultExpressionEngine } from "@data-prism/expressions";

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
const expression = { $sum: [10, 20] };
const data = [1, 2, 3, 4];

const result = engine.apply(expression, data);
// Returns: 10 (sum of [10, 20])
```

#### `compile(expression)`

Compiles an expression into a reusable function.

**Parameters:**

- `expression` (Expression) - The expression to compile

**Returns:** Function that takes data and returns the evaluation result

```javascript
const expression = { $gt: 18 };
const compiledFn = engine.compile(expression);

const result1 = compiledFn(25); // true
const result2 = compiledFn(16); // false
```

#### `evaluate(expression)`

Evaluates an expression without input data (for static expressions).

**Parameters:**

- `expression` (Expression) - The expression to evaluate

**Returns:** Static result of the expression

```javascript
const expression = { $sum: [10, 20] };
const result = engine.evaluate(expression);
// Returns: 30
```

#### `isExpression(value)`

Tests whether a value is a valid expression.

**Parameters:**

- `value` (any) - The value to test

**Returns:** Boolean indicating if the value is an expression

```javascript
const isExpr1 = engine.isExpression({ $get: "name" }); // true
const isExpr2 = engine.isExpression({ name: "John" }); // false
```

## Built-in Operations

### Core Operations

#### `$get`

Retrieves a value from the data object using lodash-style path notation.

```json
{ "$get": "name" }          // Gets data.name
{ "$get": "user.age" }      // Gets data.user.age (nested path)
```

#### `$literal`

Returns a literal value (useful when you need to pass a value that might be confused with an expression).

```json
{ "$literal": { "$get": "not-an-expression" } }
```

#### `$echo`

Returns the input data unchanged (identity function).

```json
{ "$echo": null } // Returns the entire input data object
```

#### `$isDefined`

Tests whether the input data is defined (not undefined).

```json
{ "$isDefined": null } // Returns true if data !== undefined
```

#### `$if`

Conditional expression that evaluates different branches based on a condition.

```json
{
	"$if": {
		"if": { "$gte": 18 },
		"then": "Adult",
		"else": "Minor"
	}
}
```

#### `$case`

Switch-like expression that matches a value against multiple cases and returns the corresponding result.

```json
{
	"$case": {
		"value": { "$get": "activity" },
		"cases": [
			{ "when": "playing", "then": "Child is playing" },
			{ "when": "napping", "then": "Child is napping" },
			{ "when": "eating", "then": "Child is eating" }
		],
		"default": "Unknown activity"
	}
}
```

The `$case` expression evaluates the `value` once and compares it against each `when` clause. When a match is found, it returns the corresponding `then` value. If no match is found, it returns the `default` value.

**When clauses support two formats:**

- **Simple equality**: `{ "when": "value" }` - matches if the value equals "value"
- **Complex expressions**: `{ "when": { "$eq": "value" } }` - evaluates the expression with the value as input

All parts (`value`, `when`, `then`, `default`) can be expressions or literal values.

#### `$compose`

Composes multiple expressions together using mathematical composition order (right-to-left). The expressions are applied in the order `f(g(h(x)))` where `[f, g, h]` means `f` applied to the result of `g` applied to the result of `h` applied to `x`.

```json
{
	"$compose": [
		{ "$map": { "$get": "name" } },     // f: map to names
		{ "$filter": { "$gt": 18 } },       // g: filter adults
		{ "$get": "users" }                 // h: get users
	]
}
```
ë
#### `$pipe`

Pipes data through multiple expressions using pipeline order (left-to-right). The expressions are applied in the order `f(g(h(x)))` where `[h, g, f]` means `h` applied to `x`, then `g` applied to that result, then `f` applied to that result.

```json
{
	"$pipe": [
		{ "$get": "users" },                // h: get users
		{ "$filter": { "$gt": 18 } },       // g: filter adults
		{ "$map": { "$get": "name" } }      // f: map to names
	]
}
```

**Note**: `$pipe` is often more intuitive as it matches the natural reading order, while `$compose` follows mathematical function composition conventions.

#### `$debug`

Logs the input data to console and returns it unchanged (useful for debugging).

```json
{ "$debug": null } // Logs data to console, returns data
```

#### `$ensurePath`

Validates that a path exists in the data, throwing an error if not found.

```json
{ "$ensurePath": "user.profile.email" } // Throws if path doesn't exist
```

#### `$apply`

Applies the parameters directly (identity for parameters).

```json
{ "$apply": [1, 2, 3] } // Returns [1, 2, 3]
```

### Logical Operations

#### `$and`

Logical AND operation - all expressions must be truthy.

```json
{ "$and": [{ "$gt": 18 }, { "$eq": "active" }] }
```

#### `$or`

Logical OR operation - at least one expression must be truthy.

```json
{ "$or": [{ "$eq": "admin" }, { "$eq": "moderator" }] }
```

#### `$not`

Logical NOT operation - inverts the truthiness of an expression.

```json
{ "$not": { "$eq": true } }
```

### Comparison Operations

All comparison operations use mathematical abbreviations for consistency and brevity.

#### `$eq` / `$ne`

Equality and inequality comparisons using deep equality.

```json
{ "$eq": "published" }  // data === "published"
{ "$ne": "draft" }      // data !== "draft"
```

#### `$lt` / `$lte` / `$gt` / `$gte`

Numeric comparisons (less than, less than or equal, greater than, greater than or equal).

```json
{ "$gt": 90 }   // data > 90
{ "$lte": 3 }   // data <= 3
```

#### `$in` / `$nin`

Array membership tests (in / not in).

```json
{ "$in": ["tech", "science", "math"] }  // data is in array
{ "$nin": ["deleted", "archived"] }     // data is not in array
```

### Aggregative Operations

#### `$sum`

Sum of array values.

```json
{ "$sum": [1, 2, 3, 4] } // Returns 10
```

#### `$min` / `$max`

Minimum/maximum of array values.

```json
{ "$max": [1, 5, 3, 9] }  // Returns 9
{ "$min": [1, 5, 3, 9] }  // Returns 1
```

#### `$count`

Count of items in an array.

```json
{ "$count": [1, 2, 3, 4] } // Returns 4
```

### Iterative Operations

#### `$map`

Transform each item in an array.

```json
{ "$map": { "$get": "name" } } // Maps over array, getting "name" from each item
```

#### `$filter`

Filter array items based on a condition.

```json
{ "$filter": { "$gt": 50 } } // Filters array, keeping items > 50
```

#### `$flatMap`

Transform and flatten array items.

```json
{ "$flatMap": { "$get": "products" } } // Maps and flattens results
```

## Examples

### Basic Usage

```javascript
import { defaultExpressionEngine } from "@data-prism/expressions";

const data = {
	user: { name: "Fatoumata", age: 30 },
	orders: [
		{ id: 1, amount: 50 },
		{ id: 2, amount: 75 },
		{ id: 3, amount: 120 },
	],
};

// Check if user is adult
const isAdult = defaultExpressionEngine.apply({ $gte: 18 }, data.user.age);
// Returns: true

// Get user name
const userName = defaultExpressionEngine.apply({ $get: "name" }, data.user);
// Returns: "Fatoumata"

// Calculate total order amount
const orderAmounts = data.orders.map((order) => order.amount);
const totalAmount = defaultExpressionEngine.apply({ $sum: orderAmounts }, null);
// Returns: 245

// Get names of adult users using pipe (left-to-right)
const adultNames = defaultExpressionEngine.apply(
	{
		$pipe: [
			{ $get: "users" },
			{ $filter: { $gte: 18 } },
			{ $map: { $get: "name" } },
		],
	},
	data,
);
// Returns: ["Fatoumata"]

// Same operation using compose (right-to-left)
const adultNamesComposed = defaultExpressionEngine.apply(
	{
		$compose: [
			{ $map: { $get: "name" } },
			{ $filter: { $gte: 18 } },
			{ $get: "users" },
		],
	},
	data,
);
// Returns: ["Fatoumata"]

// Determine child's activity status
const activityStatus = defaultExpressionEngine.apply(
	{
		$case: {
			value: { $get: "activity" },
			cases: [
				{ when: "playing", then: "Child is playing" },
				{ when: "napping", then: "Child is napping" },
				{ when: "eating", then: "Child is eating" },
			],
			default: "Unknown activity",
		},
	},
	{ activity: "playing" },
);
// Returns: "Child is playing"

// Categorize children by age group
const ageGroup = defaultExpressionEngine.apply(
	{
		$case: {
			value: { $get: "age" },
			cases: [
				{ when: { $lt: 2 }, then: "Toddler" },
				{ when: { $lt: 5 }, then: "Preschooler" },
				{ when: { $gte: 5 }, then: "School age" },
			],
			default: "Unknown age group",
		},
	},
	{ age: 4 },
);
// Returns: "Preschooler"
```

### Query Enhancement

```json
// In a Data Prism query
const query = {
  "type": "products",
  "where": {
    "$and": [
      { "$gte": 10 },
      { "$lte": 100 },
      { "$eq": true }
    ]
  },
  "select": {
    "name": "name",
    "price": "price",
    "priceWithTax": { "$sum": ["price", "tax"] },
    "category": "category"
  }
};
```

### Custom Operations

```javascript
import {
	createExpressionEngine,
	defaultExpressions,
} from "@data-prism/expressions";

const customEngine = createExpressionEngine({
	...defaultExpressions,

	// Custom string operation
	$titleCase: {
		apply: (str) => {
			return str
				.toLowerCase()
				.split(" ")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");
		},
	},

	// Custom validation operation
	$isValidEmail: {
		apply: (email) => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		},
	},
});

// Use custom operations
const result = customEngine.apply({ $titleCase: "paul bunyan" }, null);
// Returns: "Paul Bunyan"
```

### Compiled Expressions for Performance

```javascript
import { defaultExpressionEngine } from "@data-prism/expressions";

// Compile once, use many times
const calculateDiscountPrice = defaultExpressionEngine.compile({
	$if: {
		if: { $gt: 0 },
		then: { $sum: ["price", "discount"] },
		else: { $get: "price" },
	},
});

// Use compiled function repeatedly
const products = [
	{ name: "Laptop", price: 1000, discount: -100 },
	{ name: "Mouse", price: 50, discount: -2.5 },
	{ name: "Keyboard", price: 100, discount: 0 },
];

const discountedPrices = products.map((product) =>
	calculateDiscountPrice(product.discount),
);
// Returns: [900, 47.5, 100]
```

## Integration with Data Prism Core

Expressions work seamlessly with Data Prism queries:

```javascript
import { defaultExpressionEngine } from "@data-prism/expressions";
import { queryGraph } from "@data-prism/core";

const query = {
	type: "users",
	where: {
		$and: [{ $gte: 21 }, { $eq: "active" }],
	},
	select: {
		name: "name",
		isAdult: { $gte: 18 },
		ageGroup: {
			$case: {
				value: { $get: "age" },
				cases: [
					{ when: { $lt: 30 }, then: "young" },
					{ when: { $lt: 50 }, then: "middle" },
				],
				default: "senior",
			},
		},
	},
};

// Use with expression engine in query options
const results = queryGraph(schema, query, graph, {
	expressionEngine: defaultExpressionEngine,
});
```

## Related Packages

- `@data-prism/core` - Core schema and querying functionality
- `@data-prism/memory-store` - In-memory data store with expression support
- `@data-prism/postgres-store` - PostgreSQL backend with SQL expression compilation
