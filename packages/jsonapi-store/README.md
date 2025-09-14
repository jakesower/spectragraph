# SpectraGraph JSON:API Store

A client-side store implementation that connects SpectraGraph to remote JSON:API servers. Acts as a proxy, translating SpectraGraph queries into JSON:API requests and parsing responses back into SpectraGraph format.

## Installation

```bash
npm install @spectragraph/jsonapi-store
```

## Quick Start

```javascript
import { createJSONAPIStore } from "@spectragraph/jsonapi-store";

const schema = {
  resources: {
    posts: {
      attributes: {
        id: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
      },
    relationships: {
      author: { type: "users", cardinality: "one", inverse: "posts" },
    },
},
users: {
  attributes: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
  },
relationships: {
  posts: { type: "posts", cardinality: "many", inverse: "author" },
},
},
},
};

// Create a transport implementation
const transport = {
  async get(url) {
    const response = await fetch(url);
    return response.json();
  }
};

const store = createJSONAPIStore(schema, {
  transport,
  baseURL: "https://api.example.com",
});

// Use with SpectraGraph queries
const results = await store.query({
  type: "posts",
  select: ["title", "author"],
  where: { published: true },
  limit: 10,
});
```

## API Reference

### Store Creation

#### `createJSONAPIStore(schema, config)`

Creates a JSON:API store instance that proxies SpectraGraph queries to a remote server.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema defining your resources
- `config` (Object) - Store configuration
  - `config.transport` (Object) - HTTP transport implementation
  - `config.baseURL` (string) - Base URL for the JSON:API server

**Returns:** Store instance with `query()` and `create()` methods

```javascript
import { createJSONAPIStore } from "@spectragraph/jsonapi-store";

const store = createJSONAPIStore(schema, {
  transport: {
    async get(url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    return response.json();
  }
},
baseURL: "https://api.example.com"
});
```

### Store Methods

#### `store.query(query)`

Executes a SpectraGraph query against the remote JSON:API server.

**Parameters:**
- `query` (RootQuery) - SpectraGraph query object

**Returns:** Promise resolving to query results

```javascript
// Simple query
const posts = await store.query({
  type: "posts",
  select: ["title", "content"],
});

// Query with relationships
const postsWithAuthors = await store.query({
  type: "posts",
  select: {
    title: "title",
    content: "content",
    author: {
      select: ["name", "email"],
    },
},
});

// Query with filtering and pagination
const recentPosts = await store.query({
  type: "posts",
  select: ["title", "publishedAt"],
  where: {
    publishedAt: { $gte: "2024-01-01" },
    status: "published",
  },
order: [{ publishedAt: "desc" }],
limit: 20,
offset: 0,
});
```

#### `store.create(resource)` *(Placeholder)*

**Note:** The create method is currently a placeholder and not implemented.

### Request/Response Utilities

#### `formatRequest(schema, config, query)`

Converts a SpectraGraph query into a JSON:API request URL.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema
- `config` (Object) - Store configuration with baseURL
- `query` (RootQuery) - Query to format

**Returns:** Complete request URL with query parameters

```javascript
import { formatRequest } from "@spectragraph/jsonapi-store";

const url = formatRequest(schema, { baseURL: "https://api.example.com" }, {
  type: "posts",
  select: ["title", "author"],
  where: { published: true },
  limit: 10,
});
// Returns: "https://api.example.com/posts?fields[posts]=title,author&filter[published]=true&page[size]=10&page[number]=1"
```

#### `parseResponse(schema, query, response)`

Parses a JSON:API response into SpectraGraph query results.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema
- `query` (RootQuery) - Original query that generated this response
- `response` (Object) - JSON:API response object

**Returns:** Query results in SpectraGraph format

```javascript
import { parseResponse } from "@spectragraph/jsonapi-store";

const jsonApiResponse = {
  data: [
    {
      type: "posts",
      id: "1",
      attributes: { title: "My Post" },
      relationships: {
        author: { data: { type: "users", id: "123" } }
      }
  }
],
included: [
  {
    type: "users",
    id: "123",
    attributes: { name: "John Doe" }
  }
]
};

const results = parseResponse(schema, query, jsonApiResponse);
// Returns SpectraGraph formatted results
```

## Query Translation

The store automatically translates SpectraGraph queries into JSON:API requests:

### Attribute Selection

```javascript
// SpectraGraph query
{
  type: "posts",
  select: ["title", "content"]
}

// Becomes JSON:API request
// GET /posts?fields[posts]=title,content
```

### Relationship Inclusion

```javascript
// SpectraGraph query
{
  type: "posts",
  select: {
    title: "title",
    author: {
      select: ["name", "email"]
    }
}
}

// Becomes JSON:API request
// GET /posts?fields[posts]=title&fields[users]=name,email&include=author
```

### Filtering

```javascript
// SpectraGraph query
{
  type: "posts",
  where: {
    published: true,
    "author.name": "John Doe"
  }
}

// Becomes JSON:API request
// GET /posts?filter[published]=true&filter[author.name]=John%20Doe
```

### Sorting

```javascript
// SpectraGraph query
{
  type: "posts",
  order: [
    { publishedAt: "desc" },
    { title: "asc" }
  ]
}

// Becomes JSON:API request
// GET /posts?sort=-publishedAt,title
```

### Pagination

```javascript
// SpectraGraph query
{
  type: "posts",
  limit: 10,
  offset: 20
}

// Becomes JSON:API request
// GET /posts?page[size]=10&page[number]=3
```

## Transport Implementation

The store requires a transport implementation for making HTTP requests. Here are examples for different environments:

### Browser with Fetch

```javascript
const transport = {
  async get(url) {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Authorization': `Bearer ${authToken}`
      }
  });

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

return response.json();
}
};
```

### Node.js with Axios

```javascript
import axios from 'axios';

const transport = {
  async get(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.api+json'
        }
    });
  return response.data;
} catch (error) {
if (error.response) {
  // Server responded with error status
  const err = new Error(`HTTP ${error.response.status}`);
  err.response = error.response;
  throw err;
}
throw error;
}
}
};
```

### With Authentication

```javascript
const transport = {
  async get(url) {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${getAccessToken()}`
      }
  });

if (response.status === 401) {
  // Handle token refresh
  await refreshAccessToken();
  return this.get(url); // Retry
}

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

return response.json();
}
};
```

## Error Handling

The store handles common error scenarios:

```javascript
try {
  const results = await store.query(query);
} catch (error) {
if (error.transportError && error.response?.statusCode === 404) {
  // Resource not found - store returns null for 404s
  console.log("Resource not found");
} else {
// Other errors are re-thrown
console.error("Query failed:", error.message);
}
}
```

## Integration Examples

### With React

```javascript
import { useState, useEffect } from 'react';
import { createJSONAPIStore } from '@spectragraph/jsonapi-store';

function PostsList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const store = createJSONAPIStore(schema, {
    transport: { get: url => fetch(url).then(r => r.json()) },
    baseURL: 'https://api.example.com'
  });

useEffect(() => {
  async function loadPosts() {
    try {
      const results = await store.query({
        type: 'posts',
        select: ['title', 'author'],
        limit: 10
      });
    setPosts(results);
  } catch (error) {
  console.error('Failed to load posts:', error);
} finally {
setLoading(false);
}
}

loadPosts();
}, []);

if (loading) return <div>Loading...</div>;

return (
<ul>
{posts.map(post => (
  <li key={post.id}>
  {post.title} by {post.author.name}
  </li>
  ))}
</ul>
);
}
```

### With Express.js Middleware

```javascript
import express from 'express';
import { createJSONAPIStore } from '@spectragraph/jsonapi-store';

const app = express();

// Create store instance
const backendStore = createJSONAPIStore(schema, {
  transport: { get: url => fetch(url).then(r => r.json()) },
  baseURL: 'https://backend-api.example.com'
});

// Middleware to add store to requests
app.use((req, res, next) => {
  req.store = backendStore;
  next();
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await req.store.query({
      type: 'posts',
      select: ['title', 'content'],
      where: req.query.filter ? JSON.parse(req.query.filter) : undefined
    });
  res.json(posts);
} catch (error) {
res.status(500).json({ error: error.message });
}
});
```

## Limitations

- **Create/Update/Delete**: Currently only `query()` is implemented; write operations are placeholders
- **Error Handling**: Limited error handling - mostly passes through transport errors
- **Caching**: No built-in caching mechanism
- **Offline Support**: No offline capabilities

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality
- `@spectragraph/jsonapi-server` - Server-side JSON:API implementation
- `@spectragraph/memory-store` - In-memory store for development
- `@spectragraph/postgres-store` - PostgreSQL store for server applications