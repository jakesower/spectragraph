# Data Prism SQLite Store

A SQLite backend store implementation for Data Prism that provides read-only querying capabilities backed by a SQLite database. Designed for applications that need fast, embedded database querying without external dependencies or write operations.

**Note**: This package currently supports read operations only. Write operations (create, update, delete) are not yet implemented.

## Overview

Data Prism SQLite Store is built around several key principles:

- **Schema-driven**: Maps Data Prism schemas to existing SQLite table structures
- **Read-optimized**: Translates Data Prism queries to efficient SQLite SQL for fast data retrieval
- **Embedded-friendly**: Works with SQLite's serverless, zero-configuration architecture
- **Lightweight**: Minimal dependencies with focus on query performance

## Installation

```bash
npm install @data-prism/sqlite-store
```

You'll also need to install the SQLite driver:

```bash
npm install better-sqlite3
```

## Core Concepts

### SQLite Store

The SQLite store provides read-only access to existing SQLite databases through the Data Prism query interface. It's ideal for applications that need to query pre-populated databases or read-only data sources.

```javascript
import { createSQLiteStore } from "@data-prism/sqlite-store";
import Database from "better-sqlite3";

const db = new Database("path/to/database.sqlite", { readonly: true });
const store = createSQLiteStore(schema, db, {
  tableMapping: { teams: "team_table" }, // optional
});
```

### Database Mapping

The store maps Data Prism resource types to existing SQLite tables. You can provide custom table mappings if your database schema doesn't match Data Prism conventions.

## API Reference

### `createSQLiteStore(schema, db, config?)`

Creates a new SQLite store instance for read-only operations.

**Parameters:**

- `schema` (Schema) - The Data Prism schema defining resource types and relationships
- `db` (Database) - SQLite database instance from better-sqlite3
- `config.tableMapping` (object, optional) - Custom mapping of resource types to table names

**Returns:** SQLite store instance with query operations

```javascript
import { createSQLiteStore } from "@data-prism/sqlite-store";
import Database from "better-sqlite3";

const db = new Database("./data/sports.sqlite", { readonly: true });

const store = createSQLiteStore(schema, db, {
  tableMapping: {
    teams: "team_data",
    matches: "match_results",
  },
});
```

### Store Operations

#### `store.query(query)` ✅

Executes a Data Prism query against the SQLite database, generating efficient SQL.

**Parameters:**

- `query` (RootQuery) - The query to execute

**Returns:** Query results matching the query structure

```javascript
const results = await store.query({
  type: "teams",
  where: {
    city: { eq: "Phoenix" },
  },
  select: {
    name: "name",
    city: "city",
    homeMatches: {
      select: ["date", "venue"],
      order: { date: "desc" },
      limit: 5,
    },
  },
});
```

#### `store.create(resource)` ❌

**Not implemented** - Throws an error. SQLite store is read-only.

#### `store.update(resource)` ❌

**Not implemented** - Throws an error. SQLite store is read-only.

#### `store.upsert(resource)` ❌

**Not implemented** - Throws an error. SQLite store is read-only.

#### `store.delete(resource)` ❌

**Not implemented** - Throws an error. SQLite store is read-only.

## Database Schema Requirements

### Table Structure

Your SQLite tables should follow these conventions for best compatibility:

- Each resource type maps to a table
- Primary key column named `id`
- Foreign key columns for relationships follow the pattern `{relationship_name}_id`

### Example Schema

```sql
-- Teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  founded INTEGER
);

-- Matches table  
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  venue TEXT,
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id)
);
```

### Custom Table Mapping

If your database doesn't follow Data Prism conventions:

```javascript
const store = createSQLiteStore(schema, db, {
  tableMapping: {
    teams: "team_master",
    matches: "game_results",
  },
  columnMapping: {
    "teams.founded": "founding_year",
    "matches.venue": "stadium_name",
  },
});
```

## Query Translation

Data Prism queries are translated to optimized SQLite SQL:

### Basic Query

```javascript
// Data Prism query
const query = {
  type: "teams",
  select: ["name", "city"],
  where: { city: { eq: "Phoenix" } },
  limit: 10
};

// Generated SQL (approximately)
// SELECT name, city FROM teams WHERE city = 'Phoenix' LIMIT 10;
```

### Query with Relationships

```javascript
// Data Prism query
const query = {
  type: "teams", 
  select: {
    name: "name",
    homeMatches: {
      select: ["date", "venue"],
      where: { date: { gte: "2024-01-01" } }
    }
  }
};

// Generated SQL uses JOINs for efficient relationship traversal
```

## Examples

### Basic Setup

```javascript
import { createSQLiteStore } from "@data-prism/sqlite-store";
import Database from "better-sqlite3";

const schema = {
  resources: {
    teams: {
      attributes: {
        id: { type: "string" },
        name: { type: "string" },
        city: { type: "string" },
        founded: { type: "integer" },
      },
      relationships: {
        homeMatches: {
          type: "matches",
          cardinality: "many",
          inverse: "homeTeam",
        },
      },
    },
    matches: {
      attributes: {
        id: { type: "string" },
        date: { type: "string" },
        venue: { type: "string" },
      },
      relationships: {
        homeTeam: {
          type: "teams",
          cardinality: "one", 
          inverse: "homeMatches",
        },
      },
    },
  },
};

// Open existing SQLite database
const db = new Database("./sports.sqlite", { readonly: true });
const store = createSQLiteStore(schema, db);
```

### Simple Queries

```javascript
// Get all teams
const allTeams = await store.query({
  type: "teams",
  select: ["name", "city"],
});

// Get teams in specific city
const phoenixTeams = await store.query({
  type: "teams",
  where: { city: { eq: "Phoenix" } },
  select: ["name", "founded"],
  order: { founded: "desc" },
});

// Get team by ID
const team = await store.query({
  type: "teams",
  id: "team-1",
  select: ["name", "city", "founded"],
});
```

### Relationship Queries

```javascript
// Teams with their recent matches
const teamsWithMatches = await store.query({
  type: "teams",
  select: {
    name: "name",
    city: "city",
    homeMatches: {
      select: ["date", "venue"],
      where: { date: { gte: "2024-01-01" } },
      order: { date: "desc" },
      limit: 5,
    },
  },
});

// Matches with team information
const matchesWithTeams = await store.query({
  type: "matches",
  select: {
    date: "date",
    venue: "venue", 
    homeTeam: {
      select: ["name", "city"],
    },
    awayTeam: {
      select: ["name", "city"],
    },
  },
  order: { date: "desc" },
  limit: 10,
});
```

### Complex Filtering

```javascript
// Teams founded after 2000 in specific cities
const modernTeams = await store.query({
  type: "teams",
  where: {
    and: [
      { founded: { gte: 2000 } },
      { city: { in: ["Phoenix", "Scottsdale", "Tempe"] } },
    ],
  },
  select: ["name", "city", "founded"],
  order: { founded: "asc" },
});

// Recent home matches for active teams
const recentHomeMatches = await store.query({
  type: "matches",
  where: {
    and: [
      { date: { gte: "2024-01-01" } },
      { homeTeam: { exists: true } },
    ],
  },
  select: {
    date: "date",
    venue: "venue",
    homeTeam: {
      select: ["name"],
    },
  },
  order: { date: "desc" },
  limit: 20,
});
```

## Performance Considerations

### Indexing

Ensure your SQLite database has appropriate indexes for common queries:

```sql
-- Indexes for common query patterns
CREATE INDEX idx_teams_city ON teams(city);
CREATE INDEX idx_teams_founded ON teams(founded);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_home_team ON matches(home_team_id);
```

### Query Optimization

- Use specific selects rather than selecting all attributes
- Add appropriate where clauses to limit result sets
- Use limit/offset for pagination with large datasets
- Consider using composite indexes for multi-column queries

### Database Configuration

For read-only operations, configure SQLite for optimal performance:

```javascript
const db = new Database("./data.sqlite", { 
  readonly: true,
  fileMustExist: true,
});

// Configure SQLite for read performance
db.pragma("journal_mode = OFF");
db.pragma("synchronous = OFF");
db.pragma("cache_size = 10000");
```

## Limitations

### Current Limitations

- **Read-only**: Write operations are not implemented
- **Table mapping**: Requires existing SQLite tables that match your schema
- **Relationship constraints**: Cannot enforce referential integrity (read-only)

### Future Enhancements

- Write operation support (create, update, delete)
- Automatic table creation from Data Prism schemas
- Advanced SQLite-specific optimizations
- Support for SQLite extensions and custom functions

## Related Packages

- `@data-prism/core` - Core Data Prism functionality and schema definitions
- `@data-prism/interface-tests` - Test suite for validating store implementations
- `@data-prism/postgres-store` - Full-featured PostgreSQL store implementation
- `@data-prism/memory-store` - In-memory store for development and testing
- `@data-prism/expressions` - Expression engine for advanced query conditions