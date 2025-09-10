# Store Integration Guide

Data Prism stores provide a unified interface for querying different data sources. Each store implements the same query language while optimizing for their specific backend.

## Table of Contents

- [Available Stores](#available-stores)
- [Store Installation](#store-installation)
- [Store Configuration](#store-configuration)
- [Store Usage Patterns](#store-usage-patterns)
- [Migration Between Stores](#migration-between-stores)
- [Performance Considerations](#performance-considerations)

## Available Stores

### Memory Store
**Package:** `@data-prism/memory-store`  
**Use Case:** In-memory data, testing, prototyping  
**Status:** ✅ Stable

```javascript
import { createMemoryStore } from '@data-prism/memory-store';

const store = createMemoryStore(schema, {
  initialData: {
    users: {
      '1': {
        id: '1',
        type: 'users',
        attributes: { name: 'Alice', email: 'alice@example.com' },
        relationships: { posts: [{ type: 'posts', id: '1' }] }
      }
    }
  }
});
```

**Features:**
- Full JavaScript expression evaluation
- Instant queries with no I/O overhead
- Perfect for testing and development
- Automatic relationship linking
- Complete CRUD operations

### PostgreSQL Store
**Package:** `@data-prism/postgres-store`  
**Use Case:** PostgreSQL databases  
**Status:** ✅ Stable

```javascript
import { createPostgresStore } from '@data-prism/postgres-store';
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  database: 'myapp',
  user: 'user',
  password: 'password'
});

const store = createPostgresStore(schema, pool, {
  tablePrefix: 'app_',
  autoMigrate: true
});
```

**Features:**
- SQL query optimization for expressions
- Automatic table creation and migration
- Relationship joins optimized for PostgreSQL
- Full transaction support
- Custom column mapping

### SQLite Store
**Package:** `@data-prism/sqlite-store`  
**Use Case:** SQLite databases  
**Status:** ✅ Stable

```javascript
import { createSQLiteStore } from '@data-prism/sqlite-store';
import Database from 'better-sqlite3';

const db = new Database('myapp.db');
const store = createSQLiteStore(schema, db, {
  autoMigrate: true,
  enableWAL: true
});
```

**Features:**
- Lightweight embedded database
- GLOB pattern matching support
- Optimized for single-writer scenarios
- Fast aggregations and analytics
- Zero-configuration setup

### JSON:API Server
**Package:** `@data-prism/jsonapi-server`  
**Use Case:** REST API server over any store  
**Status:** ✅ Stable

```javascript
import { createJSONAPIServer } from '@data-prism/jsonapi-server';
import express from 'express';

const app = express();
const apiServer = createJSONAPIServer(underlyingStore, {
  baseURL: '/api/v1',
  enableCaching: true
});

app.use('/api/v1', apiServer.middleware);
```

**Features:**
- JSON:API compliant REST endpoints
- Automatic pagination and sorting
- Relationship includes and sparse fieldsets
- Built on any Data Prism store
- OpenAPI/Swagger documentation

## Store Installation

### Memory Store
```bash
npm install @data-prism/memory-store
```

### PostgreSQL Store
```bash
npm install @data-prism/postgres-store pg
# For TypeScript users
npm install --save-dev @types/pg
```

### SQLite Store
```bash
npm install @data-prism/sqlite-store better-sqlite3
# For TypeScript users  
npm install --save-dev @types/better-sqlite3
```

### JSON:API Server
```bash
npm install @data-prism/jsonapi-server express
# For TypeScript users
npm install --save-dev @types/express
```

## Store Configuration

### Memory Store Configuration

```javascript
import { createMemoryStore, defaultValidator } from '@data-prism/memory-store';

const store = createMemoryStore(schema, {
  // Initial data to populate the store
  initialData: graphData,
  
  // Custom validation (optional)
  validator: defaultValidator,
  
  // Custom expression engines (optional)
  selectEngine: customSelectEngine,
  whereEngine: customWhereEngine
});
```

### PostgreSQL Store Configuration

```javascript
import { createPostgresStore } from '@data-prism/postgres-store';

const store = createPostgresStore(schema, pool, {
  // Table prefix for all generated tables
  tablePrefix: 'app_',
  
  // Automatically create/update database tables
  autoMigrate: true,
  
  // Custom table/column mappings
  tableMapping: {
    users: 'app_users',
    posts: 'blog_posts'
  },
  
  // Custom column mappings  
  columnMapping: {
    users: {
      email: 'email_address',
      createdAt: 'created_at'
    }
  },
  
  // Connection pool settings
  poolConfig: {
    max: 20,
    idleTimeoutMillis: 30000
  }
});
```

### SQLite Store Configuration

```javascript
import { createSQLiteStore } from '@data-prism/sqlite-store';

const store = createSQLiteStore(schema, db, {
  // Automatically create/update tables
  autoMigrate: true,
  
  // Enable Write-Ahead Logging for better performance
  enableWAL: true,
  
  // Custom table mappings
  tableMapping: {
    users: 'app_users'
  },
  
  // SQLite-specific optimizations
  pragmas: {
    journal_mode: 'WAL',
    synchronous: 'NORMAL',
    foreign_keys: 'ON'
  }
});
```

### JSON:API Server Configuration

```javascript
import { createJSONAPIServer } from '@data-prism/jsonapi-server';

const server = createJSONAPIServer(underlyingStore, {
  // Base URL for all endpoints
  baseURL: '/api/v1',
  
  // Enable response caching
  enableCaching: true,
  cacheMaxAge: 300, // 5 minutes
  
  // Pagination settings
  defaultPageSize: 20,
  maxPageSize: 100,
  
  // Custom resource type mappings
  resourceMapping: {
    users: 'people',
    posts: 'articles'
  },
  
  // CORS configuration
  cors: {
    origin: '*',
    credentials: true
  },
  
  // Enable request logging
  enableLogging: true
});
```

## Store Usage Patterns

### Basic Store Operations

All stores implement the same interface:

```javascript
// Querying
const users = await store.query({
  type: 'users',
  select: ['name', 'email', { posts: ['title'] }],
  where: { active: true }
});

// Creating
const newUser = await store.create({
  type: 'users',
  attributes: { name: 'Bob', email: 'bob@example.com' },
  relationships: { posts: [{ type: 'posts', id: '1' }] }
});

// Updating
const updatedUser = await store.update({
  type: 'users',
  id: '1',
  attributes: { name: 'Robert' }
});

// Deleting
await store.delete({ type: 'users', id: '1' });
```

### Store-Specific Optimizations

**Memory Store - Batch Operations:**
```javascript
// Efficient bulk operations
store.linkInverses(); // Rebuild relationship links

const resources = await store.merge([
  { type: 'users', attributes: { name: 'Alice' } },
  { type: 'users', attributes: { name: 'Bob' } }
]);
```

**PostgreSQL Store - Transactions:**
```javascript
// Use database transactions
await store.transaction(async (trx) => {
  await trx.create({ type: 'users', attributes: { name: 'Alice' } });
  await trx.create({ type: 'posts', attributes: { title: 'Hello' } });
});
```

**SQLite Store - Prepared Statements:**
```javascript
// Prepared statements for repeated queries
const preparedQuery = store.prepare({
  type: 'users',
  select: ['name'],
  where: { status: ':status' }
});

const activeUsers = preparedQuery.all({ status: 'active' });
```

### Error Handling

```javascript
try {
  const result = await store.query(query);
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Query validation failed:', error.message);
  } else if (error.name === 'ConnectionError') {
    console.error('Database connection failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Migration Between Stores

### Development to Production

Start with Memory Store for development:

```javascript
// Development setup
const devStore = createMemoryStore(schema, {
  initialData: seedData
});
```

Migrate to PostgreSQL for production:

```javascript
// Production setup  
const prodStore = createPostgresStore(schema, pool, {
  autoMigrate: true
});

// Data migration (if needed)
const data = await devStore.query({ type: '*', select: '*' });
await prodStore.merge(data);
```

### Store Abstraction Pattern

Create a store factory for environment-specific configuration:

```javascript
function createStore(environment) {
  switch (environment) {
    case 'test':
      return createMemoryStore(schema, { initialData: testData });
    
    case 'development':
      return createSQLiteStore(schema, new Database(':memory:'));
    
    case 'production':
      return createPostgresStore(schema, pool, { autoMigrate: false });
    
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

// Usage
const store = createStore(process.env.NODE_ENV);
```

### Schema Evolution

Handle schema changes across stores:

```javascript
const schema = {
  version: 2,
  resources: {
    users: {
      attributes: {
        name: { type: 'string' },
        email: { type: 'string' },
        // New field in v2
        verified: { type: 'boolean', default: false }
      }
    }
  },
  
  // Migration logic
  migrations: {
    1: (store) => {
      // Add verified field to existing users
      return store.update({
        type: 'users',
        where: {},
        attributes: { verified: false }
      });
    }
  }
};
```

## Performance Considerations

### Memory Store
- **Pros**: Zero latency, full JavaScript expressions
- **Cons**: Limited by available memory
- **Best For**: Testing, development, small datasets

### PostgreSQL Store
- **Pros**: Scalable, ACID transactions, complex queries
- **Cons**: Network latency, connection management
- **Best For**: Large applications, multi-user systems

### SQLite Store  
- **Pros**: No network overhead, simple deployment
- **Cons**: Single-writer limitation, no horizontal scaling
- **Best For**: Desktop apps, single-user systems, read-heavy workloads

### JSON:API Server
- **Pros**: Standard REST interface, caching, pagination
- **Cons**: HTTP overhead, request/response serialization
- **Best For**: Web APIs, microservices, client-server architectures

### Query Optimization Tips

**Use appropriate field selection:**
```javascript
// ❌ Don't select everything
const users = await store.query({
  type: 'users',
  select: '*'
});

// ✅ Select only what you need  
const users = await store.query({
  type: 'users',
  select: ['name', 'email']
});
```

**Apply filters early:**
```javascript
// ❌ Filter after fetching
const allUsers = await store.query({ type: 'users', select: '*' });
const activeUsers = allUsers.filter(u => u.active);

// ✅ Filter at the database level
const activeUsers = await store.query({
  type: 'users', 
  select: ['name'],
  where: { active: true }
});
```

**Use pagination for large datasets:**
```javascript
// ✅ Paginate large results
const page1 = await store.query({
  type: 'posts',
  select: ['title'],
  order: { createdAt: 'desc' },
  limit: 20,
  offset: 0
});
```

**Optimize relationship loading:**
```javascript
// ❌ N+1 query pattern
const users = await store.query({ type: 'users', select: ['name'] });
for (const user of users) {
  user.posts = await store.query({
    type: 'posts',
    select: ['title'],
    where: { authorId: user.id }
  });
}

// ✅ Include relationships in single query
const users = await store.query({
  type: 'users',
  select: ['name', { posts: ['title'] }]
});
```

For custom store development, see [store-creation.md](store-creation.md).
For complete API reference, see [api.md](api.md).