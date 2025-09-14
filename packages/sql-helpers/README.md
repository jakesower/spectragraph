# SpectraGraph SQL Helpers

Shared utilities and helper functions for building SQL-based SpectraGraph store implementations. This package provides the foundational building blocks that SQL stores (PostgreSQL, SQLite, etc.) use to translate SpectraGraph operations into efficient SQL queries.

## Overview

SpectraGraph SQL Helpers is designed around several key principles:

- **Database-agnostic**: Core SQL patterns that work across different SQL databases
- **Query translation**: Transform SpectraGraph queries into optimized SQL
- **Relationship handling**: Manage complex relationship mappings and joins
- **Resource transformation**: Convert between SpectraGraph resources and database rows
- **Expression compilation**: Process SpectraGraph expressions into SQL predicates

## Installation

```bash
npm install @spectragraph/sql-helpers
```

**Note:** This is primarily a utility package used by SQL store implementations. Most developers will use specific store packages like `@spectragraph/postgres-store` or `@spectragraph/sqlite-store` rather than using this directly.

## Core Concepts

### Query Translation

SQL Helpers provides utilities to transform SpectraGraph queries into SQL components:

```javascript
import { extractQueryClauses } from "@spectragraph/sql-helpers";

// Transform SpectraGraph query into SQL clauses
const clauses = extractQueryClauses(query, schema, config);
// Returns: { select, from, where, orderBy, limit, joins }
```

### Relationship Builders

Generate SQL JOIN statements for different relationship cardinalities:

```javascript
import { makeRelationshipBuilders } from "@spectragraph/sql-helpers";

const builders = makeRelationshipBuilders(schema);
const joinSQL = builders.one.many({
  foreignConfig,
  foreignTableAlias: "posts_alias",
  localConfig,
  localQueryTableName: "users",
  relName: "posts",
  foreignIdCol: "id",
});
```

### Resource Transformations

Convert between SpectraGraph resource formats and database row formats:

```javascript
import {
  buildResourceObject,
  prepareValuesForStorage,
  getAttributeColumns,
} from "@spectragraph/sql-helpers";

// Convert database row to SpectraGraph resource
const resource = buildResourceObject(row, resourceConfig, schema);

// Prepare resource for database storage
const values = prepareValuesForStorage(resource, resourceConfig);

// Get column names for attributes (camelCase → snake_case)
const columns = getAttributeColumns(resource.attributes);
```

## API Reference

### Query Processing

#### `extractQueryClauses(query, schema, config)`

Extracts SQL query components from a SpectraGraph query.

**Parameters:**

- `query` (RootQuery) - SpectraGraph query to translate
- `schema` (Schema) - Resource schema definitions
- `config` (object) - Database-specific configuration

**Returns:** Object with SQL clause components

```javascript
const clauses = extractQueryClauses(
  {
    type: "users",
    where: { active: true },
    select: ["name", "email"],
    limit: 10,
  },
  schema,
  config,
);

// clauses = {
//   select: ["users.name", "users.email"],
//   where: ["users.active = ?"],
//   vars: [true],
//   limit: 10
// }
```

#### `extractGraph(query)`

Extracts relationship graph structure from a SpectraGraph query for join planning.

### Relationship Management

#### `makeRelationshipBuilders(schema)`

Creates builders for different relationship cardinalities.

**Returns:** Object with builders for `one.one`, `one.many`, `many.one`, `many.many`, and `none.many` relationships

#### `preQueryRelationships(query, schema, config)`

Pre-processes relationship data before query execution.

### Resource Transformations

#### `buildResourceObject(row, resourceConfig, schema)`

Constructs a SpectraGraph resource object from a database row.

#### `prepareValuesForStorage(resource, resourceConfig)`

Prepares resource values for database insertion/update.

#### `getAttributeColumns(attributes)` / `getRelationshipColumns(relationships, joinConfig)`

Gets database column names for resource attributes and relationships.

#### `transformRowKeys(row, transformFn)`

Transforms database row keys (e.g., snake_case to camelCase).

### Constraint Operators

#### `baseConstraintOperatorDefinitions`

Base SQL constraint operators (`$and`, `$or`, `$eq`, `$gt`, etc.) that work across SQL databases.

#### `createConstraintOperators(customOperators)`

Creates constraint operator set with custom database-specific operators.

```javascript
import {
  baseConstraintOperatorDefinitions,
  createConstraintOperators,
} from "@spectragraph/sql-helpers";

const operators = createConstraintOperators({
  ...baseConstraintOperatorDefinitions,
  $ilike: postgresSpecificILikeOperator,
  $jsonContains: postgresJsonOperator,
});
```

### Expression Compilation

#### `DEFAULT_WHERE_EXPRESSIONS` / `DEFAULT_SELECT_EXPRESSIONS`

Default expression handlers for WHERE clauses and SELECT statements.

### Column Type Management

#### `baseColumnTypeModifiers`

Base column type transformations for common data types.

#### `createColumnTypeModifiers(customModifiers)`

Creates column type modifier set with database-specific transformations.

#### `transformValuesForStorage(values, typeModifiers)`

Transforms values according to column type modifiers before storage.

## Usage Patterns

### Building a SQL Store

SQL Helpers is designed to be used by SQL store implementations:

```javascript
import {
  extractQueryClauses,
  makeRelationshipBuilders,
  buildResourceObject,
  baseConstraintOperatorDefinitions,
  createConstraintOperators,
} from "@spectragraph/sql-helpers";

export function createMyStore(schema, dbClient, config) {
  const relationshipBuilders = makeRelationshipBuilders(schema);
  const operators = createConstraintOperators({
    ...baseConstraintOperatorDefinitions,
    // Add database-specific operators
  });

  return {
    async query(query) {
      // 1. Extract SQL components
      const clauses = extractQueryClauses(query, schema, {
        operators,
        ...config,
      });

      // 2. Build SQL query
      const sql = `SELECT ${clauses.select.join(", ")}
                   FROM ${clauses.from}
                   ${clauses.joins?.join(" ")}
                   WHERE ${clauses.where.join(" AND ")}
                   ${clauses.orderBy ? `ORDER BY ${clauses.orderBy}` : ""}
                   ${clauses.limit ? `LIMIT ${clauses.limit}` : ""}`;

      // 3. Execute query
      const rows = await dbClient.query(sql, clauses.vars);

      // 4. Transform results
      return rows.map((row) =>
        buildResourceObject(row, config.resources[query.type], schema),
      );
    },

    // ... other CRUD operations
  };
}
```

### Custom Relationship Builders

For databases with special relationship handling:

```javascript
const customBuilders = makeRelationshipBuilders(schema);

// Override specific builders
customBuilders.many.many = (params) => {
  // Custom many-to-many JOIN logic for your database
  return [`CUSTOM JOIN LOGIC FOR ${params.relName}`];
};
```

### Database-Specific Operators

Add database-specific constraint operators:

```javascript
const postgresOperators = createConstraintOperators({
  ...baseConstraintOperatorDefinitions,
  $ilike: {
    compile: (exprVal, compile) => () => {
      const [left, right] = exprVal.map((v) => compile(v)());
      return {
        where: [`${left.where} ILIKE ${right.where}`],
        vars: [...left.vars, ...right.vars],
      };
    },
  },
  $jsonPath: {
    compile: (exprVal, compile) => () => {
      const [jsonCol, path, value] = exprVal.map((v) => compile(v)());
      return {
        where: [`${jsonCol.where}->>${path.where} = ${value.where}`],
        vars: [...jsonCol.vars, ...path.vars, ...value.vars],
      };
    },
  },
});
```

## Integration Examples

### With PostgreSQL

```javascript
import { createConstraintOperators } from "@spectragraph/sql-helpers";
import pg from "pg";

const operators = createConstraintOperators({
  ...baseConstraintOperatorDefinitions,
  $ilike: postgresILikeOperator,
  $regex: postgresRegexOperator,
});

const store = createPostgresStore(schema, pgClient, { operators });
```

### With SQLite

```javascript
import { createConstraintOperators } from "@spectragraph/sql-helpers";
import Database from "better-sqlite3";

const operators = createConstraintOperators({
  ...baseConstraintOperatorDefinitions,
  $glob: sqliteGlobOperator,
  $match: sqliteMatchOperator,
});

const store = createSQLiteStore(schema, sqliteDb, { operators });
```

## Design Philosophy

SQL Helpers follows these design principles:

- **Composability**: Small, focused utilities that can be combined
- **Database neutrality**: Core patterns work across SQL databases
- **Extensibility**: Easy to add database-specific enhancements
- **Performance**: Generate efficient SQL with minimal overhead
- **Type safety**: Comprehensive JSDoc typing for development experience

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality and schema definitions
- `@spectragraph/query-helpers` - General query traversal and manipulation utilities
- `@spectragraph/postgres-store` - PostgreSQL store implementation using these helpers
- `@spectragraph/sqlite-store` - SQLite store implementation using these helpers
- `@spectragraph/interface-tests` - Test suite for validating store implementations
