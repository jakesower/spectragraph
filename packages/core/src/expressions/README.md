# Data Prism Expressions

A JavaScript expression engine for enhancing Data Prism queries with computed values and conditional logic. Data Prism Expressions provides a JSON-based syntax for creating dynamic where clauses and calculated select fields, extending the core querying capabilities with lightweight programmatic logic.

It is suitable for more general applications that call for simple logic that needs to be written as JSON. It is inspired by the Lisp concept of code being data.

## Overview

Data Prism Expressions is built around several key principles:

- **Query enhancement**: Adds computed fields and conditional logic to Data Prism queries
- **Extensible**: Built for users to extend with custom expressions and operations
- **Lightweight**: Focuses on the most common expressions needed in data queries
- **JSON-native**: Uses JSON objects that can be serialized and stored

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

The expression engine holds the expressions definitions and allows for them to be used in a few ways:

#### `apply`

Applies the expression like a function to a value.

```javascript
import { defaultExpressionEngine } from "@data-prism/core";

const expression = { $gt: 21 };
const data = 25;

const result = defaultExpressionEngine.apply(expression, value);
// Returns: true
```

#### `evaluate`

Takes an expression in its evaluable form and evaluates it, returning a value wholly determined by the expression itself. It is not applied to anything, but is fully self-contained.

```javascript
// Evaluate expressions without input data (for static expressions)
const staticResult = defaultExpressionEngine.evaluate({ $sum: [1, 2, 3] });
// Returns: 6
```

#### `normalizeWhereClause`

Transforms an expression from Data Prism's user-focused form to an equivalent expression that's more suitable for consumption by stores as they execute the `where` clause of a query. It lives in this repository for extensibility purposes, as expressions can define their own `normalizeWhere` functions to handle complex behavior.

## API Reference

### Core Functions

#### `createExpressionEngine(definitions)`

Creates a custom expression engine with additional operation definitions.

**Parameters:**

- `definitions` (object) - Custom operation definitions to add to the engine

**Returns:** ExpressionEngine with core + custom operations

```javascript
import { createExpressionEngine } from "@data-prism/core";

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
import { defaultExpressionEngine } from "@data-prism/core";

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
const isExpr2 = engine.isExpression({ name: "Juan" }); // false
```

#### `normalizeWhereClause(where)`

Normalizes a user-friendly where clause into executable expressions for query processing.

**Parameters:**

- `where` (object) - The where clause to normalize

**Returns:** Normalized expression suitable for query execution

```javascript
const where = { name: "Juan", age: { $gt: 18 } };
const normalized = engine.normalizeWhereClause(where);
// Returns: { $and: [
//   { $pipe: [{ $get: "name" }, { $eq: "Juan" }] },
//   { $pipe: [{ $get: "age" }, { $gt: 18 }] }
// ] }
```

## Built-in Operations

### Core Operations

#### `$compose`

Composes multiple expressions together using mathematical composition order (right-to-left). The expressions are applied in the order `f(g(h(x)))` where `[f, g, h]` means `f` applied to the result of `g` applied to the result of `h` applied to `x`.

```json
{
	"$compose": [
		{ "$map": { "$get": "name" } }, // f: map to names
		{ "$filter": { "$gt": 18 } }, // g: filter adults
		{ "$get": "users" } // h: get users
	]
}
```

#### `$debug`

Evaluates an expression, logs the result to console, and returns the result (useful for debugging intermediate values in expression chains).

```json
{ "$debug": { "$get": "name" } } // Logs the value of data.name, returns data.name
{ "$debug": { "$sum": [1, 2, 3] } } // Logs 6, returns 6
```

#### `$ensurePath`

Validates that a path exists in the data, throwing an error if not found.

```json
{ "$ensurePath": "user.profile.email" } // Throws if path doesn't exist
```

#### `$get`

Retrieves a value from the data object using lodash-style path notation.

```json
{ "$get": "name" }          // Gets data.name
{ "$get": "user.age" }      // Gets data.user.age (nested path)
```

#### `$isDefined`

Tests whether the input data is defined (not undefined).

```json
{ "$isDefined": null } // Returns true if data !== undefined
```

#### `$literal`

Returns a literal value (useful when you need to pass a value that might be confused with an expression).

```json
{ "$literal": { "$get": "not-an-expression" } }
```

#### `$pipe`

Pipes data through multiple expressions using pipeline order (left-to-right). The expressions are applied in the order `h(g(f(x)))` where `[h, g, f]` means `f` applied to `x`, then `g` applied to that result, then `h` applied to that result.

```json
{
	"$pipe": [
		{ "$get": "users" }, // h: get users
		{ "$filter": { "$gt": 18 } }, // g: filter adults
		{ "$map": { "$get": "name" } } // f: map to names
	]
}
```

**Note**: `$pipe` is often more intuitive as it matches the natural reading order, while `$compose` follows mathematical function composition conventions.

### Conditional Operations

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

### Logical Operations

#### `$and`

Logical AND operation - all expressions must be truthy.

```json
{ "$and": [{ "$gt": 18 }, { "$eq": "active" }] }
```

#### `$not`

Logical NOT operation - inverts the truthiness of an expression.

```json
{ "$not": { "$eq": true } }
```

#### `$or`

Logical OR operation - at least one expression must be truthy.

```json
{ "$or": [{ "$eq": "admin" }, { "$eq": "moderator" }] }
```

### Comparison Operations

All comparison operations use mathematical abbreviations for consistency and brevity.

#### `$eq`

Equality comparison using deep equality.

```json
{ "$eq": "published" } // data === "published"
```

#### `$gt`

Greater than comparison.

```json
{ "$gt": 90 } // data > 90
```

#### `$gte`

Greater than or equal comparison.

```json
{ "$gte": 18 } // data >= 18
```

#### `$in`

Array membership test (in).

```json
{ "$in": ["tech", "science", "math"] } // data is in array
```

#### `$lt`

Less than comparison.

```json
{ "$lt": 100 } // data < 100
```

#### `$lte`

Less than or equal comparison.

```json
{ "$lte": 3 } // data <= 3
```

#### `$ne`

Inequality comparison using deep equality.

```json
{ "$ne": "draft" } // data !== "draft"
```

#### `$nin`

Array membership test (not in).

```json
{ "$nin": ["deleted", "archived"] } // data is not in array
```

### Aggregative Operations

#### `$count`

Count of items in an array.

```json
{ "$count": [1, 2, 3, 4] } // Returns 4
```

#### `$max`

Maximum of array values.

```json
{ "$max": [1, 5, 3, 9] } // Returns 9
```

#### `$mean`

Arithmetic mean (average) of array values.

```json
{ "$mean": [1, 2, 3, 4, 5] } // Returns 3
```

Returns `undefined` for empty arrays.

#### `$median`

Median (middle value) of array values.

```json
{ "$median": [1, 2, 3, 4, 5] } // Returns 3
{ "$median": [1, 2, 3, 4] }    // Returns 2.5 (average of middle two)
```

Returns `undefined` for empty arrays.

#### `$min`

Minimum of array values.

```json
{ "$min": [1, 5, 3, 9] } // Returns 1
```

#### `$mode`

Mode (most frequent value) of array values.

```json
{ "$mode": [1, 2, 2, 3, 4] }    // Returns 2 (single mode)
{ "$mode": [1, 1, 2, 2, 3] }    // Returns [1, 2] (multiple modes)
{ "$mode": [1, 2, 3, 4, 5] }    // Returns undefined (no mode)
```

Returns the single mode value, array of multiple modes, or `undefined` if no mode exists.

#### `$quantile`

Calculates quantiles (percentiles, quartiles, etc.) of array values.

```json
// Quartiles (4-quantiles)
{ "$quantile": { "values": [1,2,3,4,5,6,7,8,9,10], "k": 1, "n": 4 } } // Q1
{ "$quantile": { "values": [1,2,3,4,5,6,7,8,9,10], "k": 2, "n": 4 } } // Q2 (median)
{ "$quantile": { "values": [1,2,3,4,5,6,7,8,9,10], "k": 3, "n": 4 } } // Q3

// Percentiles (100-quantiles)
{ "$quantile": { "values": [1,2,3,4,5,6,7,8,9,10], "k": 50, "n": 100 } } // 50th percentile
{ "$quantile": { "values": [1,2,3,4,5,6,7,8,9,10], "k": 90, "n": 100 } } // 90th percentile
```

**Parameters:**

- `values`: Array of numeric values
- `k`: The k-th quantile to calculate (0 ≤ k ≤ n)
- `n`: The total number of quantiles (e.g., 4 for quartiles, 100 for percentiles)

Returns `undefined` for empty arrays. Uses linear interpolation for non-integer indices.

#### `$sum`

Sum of array values.

```json
{ "$sum": [1, 2, 3, 4] } // Returns 10
```

### Iterative Operations

#### `$all`

Tests if all elements in an array satisfy a predicate (similar to Array.every).

```json
{ "$all": { "$gt": 0 } } // Returns true if all items > 0
```

#### `$any`

Tests if any element in an array satisfies a predicate (similar to Array.some).

```json
{ "$any": { "$gt": 50 } } // Returns true if any item > 50
```

#### `$concat`

Concatenates two arrays together.

```json
{ "$concat": [4, 5] } // With input [1, 2, 3], returns [1, 2, 3, 4, 5]
```

#### `$filter`

Filter array items based on a condition.

```json
{ "$filter": { "$gt": 50 } } // Filters array, keeping items > 50
```

#### `$find`

Returns the first element in an array that satisfies a predicate, or undefined if none found.

```json
{ "$find": { "$eq": "target" } } // Returns first item === "target"
```

#### `$flatMap`

Transform and flatten array items.

```json
{ "$flatMap": { "$get": "products" } } // Maps and flattens results
```

#### `$join`

Joins array elements into a string with a separator.

```json
{ "$join": ", " } // With input [1, 2, 3], returns "1, 2, 3"
{ "$join": "" }   // With input ["a", "b", "c"], returns "abc"
```

#### `$map`

Transform each item in an array.

```json
{ "$map": { "$get": "name" } } // Maps over array, getting "name" from each item
```

#### `$reverse`

Returns a new array with elements in reverse order.

```json
{ "$reverse": {} } // With input [1, 2, 3], returns [3, 2, 1]
```

### Generative Operations

#### `$random`

Generates a random number with optional range and precision control.

```json
{ "$random": {} }                                          // 0 to 1 (default)
{ "$random": { "min": 10, "max": 20 } }                   // 10 to 20 range
{ "$random": { "min": 0, "max": 1, "precision": 2 } }     // 2 decimal places (0.XX)
{ "$random": { "min": 0, "max": 100, "precision": 0 } }   // Integers (0 decimal places)
{ "$random": { "min": 0, "max": 1000, "precision": -1 } } // Round to nearest 10
```

**Parameters:**

- `min` (default: 0): Minimum value (inclusive)
- `max` (default: 1): Maximum value (exclusive)
- `precision` (default: null): Decimal places for positive values, or power of 10 for negative values
  - `precision: 2` → 2 decimal places (0.01 precision)
  - `precision: 0` → integers (1.0 precision)
  - `precision: -1` → round to nearest 10
  - `precision: null` → no rounding (full precision)

#### `$uuid`

Generates a unique UUID v4 string.

```json
{ "$uuid": null } // Returns UUID like "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

The operand is ignored - this expression always generates a new UUID.

### Math Operations

#### `$add`

Binary addition operation.

**Apply form** (operates on input data):

```json
apply({ "$add": 3 }, 5)     // Returns 8 (5 + 3)
apply({ "$add": -2 }, 10)   // Returns 8 (10 + (-2))
```

**Evaluate form** (pure calculation):

```json
{ "$add": [5, 3] }          // Returns 8
{ "$add": [1, -2] }         // Returns -1
```

Apply form adds operand to input data. Evaluate form requires array of exactly 2 numbers.

#### `$subtract`

Binary subtraction operation.

**Apply form** (operates on input data):

```json
apply({ "$subtract": 3 }, 10)   // Returns 7 (10 - 3)
apply({ "$subtract": -2 }, 5)   // Returns 7 (5 - (-2))
```

**Evaluate form** (pure calculation):

```json
{ "$subtract": [10, 3] }        // Returns 7
{ "$subtract": [5, -2] }        // Returns 7
```

Apply form subtracts operand from input data. Evaluate form requires array of exactly 2 numbers.

#### `$multiply`

Binary multiplication operation.

**Apply form** (operates on input data):

```json
apply({ "$multiply": 3 }, 5)    // Returns 15 (5 * 3)
apply({ "$multiply": 0.5 }, 4)  // Returns 2 (4 * 0.5)
```

**Evaluate form** (pure calculation):

```json
{ "$multiply": [6, 7] }         // Returns 42
{ "$multiply": [5, 0] }         // Returns 0
```

Apply form multiplies input data by operand. Evaluate form requires array of exactly 2 numbers.

#### `$divide`

Binary division operation.

**Apply form** (operates on input data):

```json
apply({ "$divide": 3 }, 15)     // Returns 5 (15 / 3)
apply({ "$divide": 0.5 }, 1)    // Returns 2 (1 / 0.5)
```

**Evaluate form** (pure calculation):

```json
{ "$divide": [15, 3] }          // Returns 5
{ "$divide": [1, 0.5] }         // Returns 2
```

Apply form divides input data by operand. Evaluate form requires array of exactly 2 numbers. Throws "Division by zero" error for zero divisors.

#### `$modulo`

Binary modulo (remainder) operation.

**Apply form** (operates on input data):

```json
apply({ "$modulo": 3 }, 10)     // Returns 1 (10 % 3)
apply({ "$modulo": 4 }, 15)     // Returns 3 (15 % 4)
```

**Evaluate form** (pure calculation):

```json
{ "$modulo": [10, 3] }          // Returns 1
{ "$modulo": [15, 4] }          // Returns 3
```

Apply form computes input data modulo operand. Evaluate form requires array of exactly 2 numbers. Throws "Modulo by zero" error for zero divisors.

### Temporal Operations

#### `$nowLocal`

Returns the current date and time as a local RFC3339 string with timezone offset.

```json
{ "$nowLocal": null } // Returns "2024-01-01T05:00:00.000-07:00"
```

The operand is ignored - this expression returns the current local time with timezone information in RFC3339 format.

#### `$nowUTC`

Returns the current date and time as a UTC RFC3339 string.

```json
{ "$nowUTC": null } // Returns "2024-01-01T12:00:00.000Z"
```

The operand is ignored - this expression always returns the current UTC time in RFC3339 format.

#### `$timestamp`

Returns the current timestamp as a number (milliseconds since Unix epoch).

```json
{ "$timestamp": null } // Returns current timestamp like 1704067200000
```

The operand is ignored - this expression always returns the current timestamp when evaluated.

## Examples

### Basic Usage

```javascript
import { defaultExpressionEngine } from "@data-prism/core";

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

// Calculate average order amount
const avgAmount = defaultExpressionEngine.apply({ $mean: orderAmounts }, null);
// Returns: 81.67

// Get median order amount
const medianAmount = defaultExpressionEngine.apply(
	{ $median: orderAmounts },
	null,
);
// Returns: 75

// Calculate 75th percentile of order amounts
const p75 = defaultExpressionEngine.apply(
	{
		$quantile: { values: orderAmounts, k: 75, n: 100 },
	},
	null,
);
// Returns: 97.5

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

// Generate random data with parameters
const randomValue = defaultExpressionEngine.apply({ $random: {} }, null);
// Returns: 0.7234 (random number 0-1)

const randomInt = defaultExpressionEngine.apply(
	{
		$random: { min: 1, max: 100, precision: 0 },
	},
	null,
);
// Returns: 42 (random integer 1-99)

const randomPrice = defaultExpressionEngine.apply(
	{
		$random: { min: 10, max: 50, precision: 2 },
	},
	null,
);
// Returns: 23.45 (random price with 2 decimal places)

const uniqueId = defaultExpressionEngine.apply({ $uuid: null }, null);
// Returns: "f47ac10b-58cc-4372-a567-0e02b2c3d479" (unique UUID)

// Get current time information
const utcTime = defaultExpressionEngine.apply({ $nowUTC: null }, null);
// Returns: "2024-01-01T12:00:00.000Z" (UTC time string)

const localTime = defaultExpressionEngine.apply({ $nowLocal: null }, null);
// Returns: "2024-01-01T05:00:00.000-07:00" (local time with timezone)

const timestamp = defaultExpressionEngine.apply({ $timestamp: null }, null);
// Returns: 1704067200000 (current timestamp)

// Use in conditional logic
const sessionId = defaultExpressionEngine.apply(
	{
		$if: {
			if: { $eq: null },
			then: { $uuid: null },
			else: { $get: "existingId" },
		},
	},
	{ existingId: null },
);
// Returns: new UUID since existingId is null

// Evaluate static expressions
const staticExpr = { $sum: [10, 20, 30] };
const precomputed = defaultExpressionEngine.evaluate(staticExpr);
console.log("Static result:", precomputed); // 60

// Evaluate static query expressions
const queryExpression = {
	$if: {
		if: true, // Static condition
		then: { $sum: [1, 2, 3] }, // Static calculation
		else: { $get: "fallbackValue" },
	},
};

const optimized = defaultExpressionEngine.evaluate(queryExpression);
console.log("Pre-computed result:", optimized); // 6
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
import { createExpressionEngine, defaultExpressions } from "@data-prism/core";

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

### Expressions for Reusable Logic

```javascript
import { defaultExpressionEngine } from "@data-prism/core";

// Define reusable expression
const discountPriceExpression = {
	$if: {
		if: { $gt: 0 },
		then: { $sum: ["price", "discount"] },
		else: { $get: "price" },
	},
};

// Apply to multiple products
const products = [
	{ name: "Laptop", price: 1000, discount: -100 },
	{ name: "Mouse", price: 50, discount: -2.5 },
	{ name: "Keyboard", price: 100, discount: 0 },
];

const discountedPrices = products.map((product) =>
	defaultExpressionEngine.apply(discountPriceExpression, product),
);
// Returns: [900, 47.5, 100]
```

## Integration with Data Prism Core

Expressions work seamlessly with Data Prism queries:

```javascript
import { defaultExpressionEngine, queryGraph } from "@data-prism/core";

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

## Notes

- `executionContext` is available for use by expression engines. It is _not,_ however, used in the default implementation.

## Related Packages

- `@data-prism/core` - Core schema and querying functionality
- `@data-prism/memory-store` - In-memory data store with expression support
- `@data-prism/postgres-store` - PostgreSQL backend with SQL expression compilation
