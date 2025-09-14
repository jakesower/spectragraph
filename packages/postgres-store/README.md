# SpectraGraph PostgreSQL Store

A PostgreSQL backend store implementation for SpectraGraph that provides CRUD operations, advanced querying, and relationship management backed by a PostgreSQL database. Designed for production applications requiring persistent data storage, concurrent access, and complex queries.

## Overview

SpectraGraph PostgreSQL Store is built around several key principles:

- **Schema-driven**: Automatically generates and manages PostgreSQL tables from SpectraGraph schemas
- **Relationship-aware**: Maintains referential integrity and bidirectional relationships
- **Query-optimized**: Translates SpectraGraph queries to efficient PostgreSQL SQL
- **Production-ready**: Supports transactions, connection pooling, and concurrent operations

## Installation

```bash
npm install @spectragraph/postgres-store
```

You'll also need to install the PostgreSQL client driver:

```bash
npm install pg
```

## Core Concepts

### PostgreSQL Store

The PostgreSQL store manages your data in properly normalized PostgreSQL tables, with automatic schema generation and relationship management. Tables are created based on your SpectraGraph schema, with foreign keys maintaining referential integrity.

```javascript
import { createPostgresStore } from "@spectragraph/postgres-store";
import { Client } from "pg";

const client = new Client({
	connectionString: "postgresql://user:password@localhost:5432/mydb",
});
await client.connect();

const store = createPostgresStore(schema, client, {
	tablePrefix: "dp_", // optional
	validator: customValidator, // optional
});
```

### Database Schema Generation

The store automatically creates PostgreSQL tables that match your SpectraGraph schema:

- Resource attributes become table columns with appropriate PostgreSQL types
- Relationships are implemented as foreign keys or junction tables
- Indexes are created for efficient querying
- Schema migrations are handled automatically

## API Reference

### `createPostgresStore(schema, client, config?)`

Creates a new PostgreSQL store instance.

**Parameters:**

- `schema` (Schema) - The SpectraGraph schema defining resource types and relationships
- `client` (pg.Client) - Connected PostgreSQL client instance
- `config.tablePrefix` (string, optional) - Prefix for generated table names
- `config.validator` (Ajv, optional) - Custom AJV validator instance

**Returns:** PostgreSQL store instance with CRUD and query operations

```javascript
import { createPostgresStore } from "@spectragraph/postgres-store";
import { Client } from "pg";

const client = new Client({
	host: "localhost",
	port: 5432,
	database: "myapp",
	user: "myuser",
	password: "mypassword",
});

await client.connect();

const store = createPostgresStore(schema, client, {
	tablePrefix: "app_",
});
```

### Store Operations

#### `store.create(resource)`

Creates a new resource in the PostgreSQL database with automatic relationship linking and constraint validation.

**Parameters:**

- `resource` (CreateResource) - The resource to create

**Returns:** The created normalized resource

```javascript
const newTeam = await store.create({
	type: "teams",
	attributes: {
		name: "Phoenix Rising FC",
		city: "Phoenix",
		founded: 2014,
	},
	relationships: {
		homeField: { type: "fields", id: "field-1" },
	},
});
```

#### `store.update(resource)`

Updates an existing resource with automatic relationship management and validation.

**Parameters:**

- `resource` (UpdateResource) - The resource updates to apply

**Returns:** The updated normalized resource

```javascript
const updatedTeam = await store.update({
	type: "teams",
	id: "team-1",
	attributes: {
		name: "Phoenix Rising FC (Updated)",
		active: true,
	},
});
```

#### `store.upsert(resource)`

Creates a new resource or updates an existing one based on ID existence.

**Parameters:**

- `resource` (CreateResource | UpdateResource) - The resource to create or update

**Returns:** The created or updated normalized resource

#### `store.delete(resource)`

Deletes a resource from the database with proper relationship cleanup.

**Parameters:**

- `resource` (DeleteResource) - Reference to the resource to delete

**Returns:** Confirmation of deletion

```javascript
await store.delete({
	type: "teams",
	id: "team-1",
});
```

#### `store.query(query)`

Executes a SpectraGraph query against the PostgreSQL database, generating efficient SQL.

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
		homeMatches: {
			select: ["date", "opponent"],
			order: { date: "desc" },
			limit: 5,
		},
	},
});
```

## Database Schema Mapping

### Attribute Types

SpectraGraph attribute types are mapped to PostgreSQL types:

- `string` → `VARCHAR` or `TEXT`
- `integer` → `INTEGER`
- `number` → `NUMERIC`
- `boolean` → `BOOLEAN`
- `array` → `JSONB`
- `object` → `JSONB`

### Relationships

- **One-to-one**: Foreign key column in the dependent table
- **One-to-many**: Foreign key column in the "many" side table
- **Many-to-many**: Junction table with foreign keys to both related tables

### Indexes

The store automatically creates indexes for:

- Primary keys (resource IDs)
- Foreign key columns
- Frequently queried attributes
- Composite indexes for common query patterns

## Configuration Options

### Connection Configuration

```javascript
const store = createPostgresStore(schema, client, {
	tablePrefix: "myapp_", // Prefix all table names
	schemaName: "data_prism", // Use specific PostgreSQL schema
	createTables: true, // Auto-create tables (default: true)
	validator: customAjvValidator,
});
```

### Advanced Configuration

```javascript
const store = createPostgresStore(schema, client, {
	columnTypeOverrides: {
		"teams.name": "VARCHAR(255)",
		"matches.metadata": "JSONB",
	},
	indexConfig: {
		"teams.city": { type: "btree" },
		"matches.date": { type: "btree" },
	},
});
```

## Query Translation

SpectraGraph queries are translated to optimized PostgreSQL SQL:

### Basic Query

```javascript
// SpectraGraph query
const query = {
	type: "teams",
	select: ["name", "city"],
	limit: 10,
};

// Generated SQL (approximately)
// SELECT name, city FROM teams LIMIT 10;
```

### Complex Query with Relationships

```javascript
// SpectraGraph query
const query = {
	type: "teams",
	select: {
		name: "name",
		homeMatches: {
			select: ["date", "opponent"],
			where: { date: { gte: "2024-01-01" } },
		},
	},
};

// Generated SQL uses JOINs and subqueries for efficient execution
```

## Examples

### Basic Setup

```javascript
import { createPostgresStore } from "@spectragraph/postgres-store";
import { Client } from "pg";

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

const client = new Client(process.env.DATABASE_URL);
await client.connect();

const store = createPostgresStore(schema, client);
```

### CRUD Operations

```javascript
// Create
const team = await store.create({
	type: "teams",
	attributes: {
		name: "Arizona Cardinals",
		city: "Phoenix",
		founded: 1898,
	},
});

// Query
const phoenixTeams = await store.query({
	type: "teams",
	where: { city: { eq: "Phoenix" } },
	select: ["name", "founded"],
});

// Update
const updatedTeam = await store.update({
	type: "teams",
	id: team.id,
	attributes: {
		name: "Arizona Cardinals FC",
	},
});

// Delete
await store.delete({
	type: "teams",
	id: team.id,
});
```

### Advanced Querying

```javascript
// Complex query with multiple relationships and filtering
const results = await store.query({
	type: "teams",
	where: {
		founded: { gte: 2000 },
		city: { in: ["Phoenix", "Scottsdale", "Tempe"] },
	},
	select: {
		name: "name",
		city: "city",
		homeMatches: {
			where: { date: { gte: "2024-01-01" } },
			select: ["date", "venue"],
			order: { date: "desc" },
			limit: 5,
		},
	},
	order: { founded: "desc" },
	limit: 20,
});
```

### Transaction Support

```javascript
const client = new Client(DATABASE_URL);
await client.connect();

try {
	await client.query("BEGIN");

	const store = createPostgresStore(schema, client);

	const team = await store.create({
		type: "teams",
		attributes: { name: "New Team" },
	});

	const match = await store.create({
		type: "matches",
		attributes: { date: "2024-12-01", venue: "Stadium" },
		relationships: { homeTeam: { type: "teams", id: team.id } },
	});

	await client.query("COMMIT");
} catch (error) {
	await client.query("ROLLBACK");
	throw error;
}
```

## Performance Considerations

### Indexing

The store automatically creates indexes, but you may want to add custom indexes for your specific query patterns:

```sql
-- Custom indexes for common queries
CREATE INDEX idx_teams_city_founded ON teams(city, founded);
CREATE INDEX idx_matches_date_venue ON matches(date, venue);
```

### Connection Pooling

For production applications, use connection pooling:

```javascript
import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 20, // maximum number of connections
});

const store = createPostgresStore(schema, pool);
```

### Query Optimization

- Use specific selects rather than selecting all attributes
- Add appropriate where clauses to limit result sets
- Consider using limit/offset for pagination
- Use indexes on frequently queried attributes

## Testing

Tests require Docker to be running for PostgreSQL test database containers.

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality and schema definitions
- `@spectragraph/interface-tests` - Test suite for validating store implementations
- `@spectragraph/memory-store` - In-memory store for development and testing
