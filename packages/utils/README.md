# SpectraGraph Utils

Common utility functions used across the SpectraGraph ecosystem. This package provides lightweight helper functions for functional programming patterns, data transformation, and common operations that are shared between SpectraGraph packages.

## Overview

SpectraGraph Utils is built around several key principles:

- **Functional**: Pure functions with predictable behavior and no side effects
- **Type-safe**: Comprehensive TypeScript support with generic type definitions
- **Null-safe**: Graceful handling of null and undefined values
- **Minimal**: Small, focused utilities without external dependencies

## Installation

```bash
npm install @spectragraph/utils
```

## Core Concepts

### Utility Functions

The package provides utility functions that handle common patterns in data processing:

- **Mapping**: Apply functions to single items or arrays uniformly
- **Piping**: Chain operations together in a functional style
- **Null handling**: Safe operations that gracefully handle null/undefined values

## API Reference

### `applyOrMap(itemItemsOrNull, fn)`

Applies a function to an item or maps it over an array of items. Handles null and undefined gracefully by returning them unchanged.

**Parameters:**

- `itemItemsOrNull` (T | T[] | null | undefined) - Single item, array of items, or null/undefined
- `fn` (Function) - Function to apply to each item

**Returns:** Result of applying fn to the item(s), or null/undefined if input was null/undefined

```javascript
import { applyOrMap } from "@spectragraph/utils";

// Single item
applyOrMap(5, x => x * 2);           // Returns: 10

// Array of items
applyOrMap([1, 2, 3], x => x * 2);   // Returns: [2, 4, 6]

// Null/undefined handling
applyOrMap(null, x => x * 2);        // Returns: null
applyOrMap(undefined, x => x * 2);   // Returns: undefined
```

### `applyOrMapAsync(itemItemsOrNull, asyncFn)`

Applies an async function to an item or maps it over an array of items. Handles null and undefined gracefully.

**Parameters:**

- `itemItemsOrNull` (T | T[] | null | undefined) - Single item, array of items, or null/undefined  
- `asyncFn` (Function) - Async function to apply to each item

**Returns:** Promise resolving to the result of applying asyncFn to the item(s), or null/undefined if input was null/undefined

```javascript
import { applyOrMapAsync } from "@spectragraph/utils";

// Single item
await applyOrMapAsync(5, async x => x * 2);           // Returns: 10

// Array of items
await applyOrMapAsync([1, 2, 3], async x => x * 2);   // Returns: [2, 4, 6]

// Null/undefined handling
applyOrMapAsync(null, async x => x * 2);              // Returns: null
applyOrMapAsync(undefined, async x => x * 2);         // Returns: undefined
```

### `pipeThru(init, fns)`

Pipes a value through a series of functions in sequence. Each function receives the result of the previous function.

**Parameters:**

- `init` (T) - Initial value to pipe through the functions
- `fns` (Function[]) - Array of functions to pipe the value through

**Returns:** The result after applying all functions in sequence

```javascript
import { pipeThru } from "@spectragraph/utils";

const add5 = x => x + 5;
const multiply2 = x => x * 2;
const toString = x => x.toString();

pipeThru(10, [add5, multiply2, toString]); // Returns: "30"
```

## Examples

### Data Transformation

```javascript
import { applyOrMap, pipeThru } from "@spectragraph/utils";

// Transform data that might be a single item or array
const data = [{ name: "John" }, { name: "Jane" }];

const addGreeting = person => ({ ...person, greeting: `Hello, ${person.name}` });
const toUpperCase = person => ({ ...person, name: person.name.toUpperCase() });

const result = applyOrMap(data, person =>
pipeThru(person, [addGreeting, toUpperCase])
);

console.log(result);
// [
  //   { name: "JOHN", greeting: "Hello, John" },
  //   { name: "JANE", greeting: "Hello, Jane" }
  // ]
```

### Async Data Processing

```javascript
import { applyOrMapAsync } from "@spectragraph/utils";

async function fetchUserDetails(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}

// Works with both single IDs and arrays of IDs
const userIds = ["user-1", "user-2", "user-3"];
const userDetails = await applyOrMapAsync(userIds, fetchUserDetails);

// Also works with a single ID
const singleUser = await applyOrMapAsync("user-1", fetchUserDetails);
```

### Pipeline Processing

```javascript
import { pipeThru } from "@spectragraph/utils";

// Define transformation steps
const parseJson = str => JSON.parse(str);
const extractUsers = data => data.users;
const filterActive = users => users.filter(u => u.active);
const sortByName = users => users.sort((a, b) => a.name.localeCompare(b.name));

// Process data through the pipeline
const rawData = '{"users": [{"name": "Bob", "active": true}, {"name": "Alice", "active": false}]}';

const result = pipeThru(rawData, [
  parseJson,
  extractUsers,
  filterActive,
  sortByName
]);

console.log(result); // [{ name: "Bob", active: true }]
```

### Null-Safe Operations

```javascript
import { applyOrMap } from "@spectragraph/utils";

// Safely handle potentially null/undefined data
function processUserData(userData) {
  return applyOrMap(userData, user => ({
    ...user,
    displayName: user.firstName + " " + user.lastName
  }));
}

processUserData(null);        // Returns: null
processUserData(undefined);   // Returns: undefined
processUserData(user);        // Returns: processed user
processUserData([user1, user2]); // Returns: [processed user1, processed user2]
```

### Resource Processing in SpectraGraph

```javascript
import { applyOrMap, pipeThru } from "@spectragraph/utils";

// Common pattern in SpectraGraph packages
function normalizeResources(resources) {
  const addType = resource => ({ ...resource, type: resource.type || "unknown" });
  const addId = resource => ({ ...resource, id: resource.id || generateId() });
  const validateRequired = resource => {
    if (!resource.attributes) throw new Error("Missing attributes");
    return resource;
  };

return applyOrMap(resources, resource =>
pipeThru(resource, [addType, addId, validateRequired])
);
}

// Works with single resources or arrays
const singleResource = { attributes: { name: "Test" } };
const multipleResources = [
  { attributes: { name: "Test 1" } },
  { attributes: { name: "Test 2" } }
];

const normalizedSingle = normalizeResources(singleResource);
const normalizedMultiple = normalizeResources(multipleResources);
```

## TypeScript Support

SpectraGraph Utils includes comprehensive TypeScript definitions:

```typescript
import { applyOrMap, applyOrMapAsync, pipeThru } from "@spectragraph/utils";

// Type-safe transformations
const numbers: number[] = [1, 2, 3];
const doubled: number[] = applyOrMap(numbers, x => x * 2);

// Async operations
const asyncResult: Promise<string[]> = applyOrMapAsync(
["a", "b", "c"],
async (str: string): Promise<string> => str.toUpperCase()
);

// Pipeline with type inference
const result: string = pipeThru(
42,
[
  (x: number) => x * 2,      // number -> number
  (x: number) => x.toString(), // number -> string
  (x: string) => x.padStart(4, '0') // string -> string
]
);
```

## Performance Considerations

### Functional Programming Benefits

- **Immutability**: Functions don't modify input data, reducing bugs
- **Composability**: Small functions can be combined in different ways
- **Testability**: Pure functions are easy to test in isolation
- **Predictability**: Same inputs always produce same outputs

### Memory Efficiency

- **No dependencies**: Minimal memory footprint
- **Small functions**: Only include what you need
- **Lazy evaluation**: Operations are only performed when needed

### Usage Patterns

```javascript
// Efficient: Process in pipelines
const result = pipeThru(data, [transform1, transform2, transform3]);

// Less efficient: Multiple intermediate variables
const step1 = transform1(data);
const step2 = transform2(step1);
const step3 = transform3(step2);
```

## Related Packages

- `@spectragraph/core` - Uses utils for resource and query processing
- `@spectragraph/memory-store` - Uses utils for data transformations
- `@spectragraph/postgres-store` - Uses utils for SQL query building
