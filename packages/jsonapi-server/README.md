# SpectraGraph JSON:API Server

A JSON:API compliant server implementation for SpectraGraph schemas. Provides Express.js middleware and handlers for creating RESTful APIs that follow the JSON:API specification.

## Installation

```bash
npm install @spectragraph/jsonapi-server
```

## Quick Start

```javascript
import express from "express";
import { createServer } from "@spectragraph/jsonapi-server";
import { MemoryStore } from "@spectragraph/memory-store";

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

const store = new MemoryStore(schema);

// Option 1: Create a complete server
createServer(schema, store, { port: 3000 });

// Option 2: Add routes to existing Express app
const app = express();
app.use(express.json());
applySchemaRoutes(schema, store, app);
app.listen(3000);
```

## API Reference

### Server Functions

#### `createServer(schema, store, options?)`

Creates a complete Express server with JSON:API endpoints for all resources in the schema.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema defining your resources
- `store` (*) - Data store instance (e.g., MemoryStore, PostgresStore)
- `options` (Options, optional) - Server configuration
  - `options.port` (number, optional) - Port number (defaults to 3000)

**Generated Routes:**
- `GET /:type` - List resources
- `GET /:type/:id` - Get single resource
- `POST /:type` - Create resource
- `PATCH /:type/:id` - Update resource
- `DELETE /:type/:id` - Delete resource

```javascript
import { createServer } from "@spectragraph/jsonapi-server";

createServer(schema, store, { port: 8080 });
```

#### `applySchemaRoutes(schema, store, app)`

Applies JSON:API routes to an existing Express application.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema defining your resources
- `store` (*) - Data store instance
- `app` (*) - Express application instance

```javascript
import express from "express";
import { applySchemaRoutes } from "@spectragraph/jsonapi-server";

const app = express();
app.use(express.json());

applySchemaRoutes(schema, store, app);

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

app.listen(3000);
```

#### `createJSONAPIHandlers(schema, store)`

Creates individual request handlers that can be attached to custom routes.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema defining your resources
- `store` (*) - Data store instance

**Returns:** Object with handler functions:
- `getAllHandler(type)` - Returns handler for listing resources
- `getOneHandler(type)` - Returns handler for getting single resource
- `createHandler(type)` - Returns handler for creating resources
- `updateHandler(type)` - Returns handler for updating resources
- `deleteHandler(type)` - Returns handler for deleting resources

```javascript
import { createJSONAPIHandlers } from "@spectragraph/jsonapi-server";

const handlers = createJSONAPIHandlers(schema, store);

app.get("/posts", handlers.getAllHandler("posts"));
app.get("/posts/:id", handlers.getOneHandler("posts"));
app.post("/posts", handlers.createHandler("posts"));
app.patch("/posts/:id", handlers.updateHandler("posts"));
app.delete("/posts/:id", handlers.deleteHandler("posts"));
```

### Request/Response Utilities

#### `parseRequest(schema, params)`

Parses JSON:API request parameters into SpectraGraph query format.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema
- `params` (*) - Express request parameters (query, params, etc.)

**Returns:** SpectraGraph query object

```javascript
import { parseRequest } from "@spectragraph/jsonapi-server";

const query = parseRequest(schema, {
	type: "posts",
	include: "author",
	"fields[posts]": "title,content",
	"filter[published]": "true",
	sort: "-createdAt",
	"page[size]": "10",
	"page[number]": "2",
});
```

#### `formatResponse(schema, query, result)`

Formats SpectraGraph query results into JSON:API response format.

**Parameters:**
- `schema` (Schema) - SpectraGraph schema
- `query` (RootQuery) - The original query
- `result` (*) - Query results from store

**Returns:** JSON:API formatted response object

```javascript
import { formatResponse } from "@spectragraph/jsonapi-server";

const results = await store.query(query);
const response = formatResponse(schema, query, results);
// Returns: { data: [...], included: [...] }
```

## JSON:API Features

### Supported Features

#### Fetching Resources
- **Collection fetching**: `GET /posts`
- **Individual resource fetching**: `GET /posts/1`
- **Related resource fetching**: `GET /posts/1/author`
- **Related resource identifier fetching**: `GET /posts/1/relationships/author`

#### Creating, Updating, and Deleting
- **Resource creation**: `POST /posts`
- **Resource updates**: `PATCH /posts/1`
- **Resource deletion**: `DELETE /posts/1`

#### Query Parameters
- **Sparse fieldsets**: `?fields[posts]=title,author&fields[users]=name`
- **Inclusion**: `?include=author,comments.user`
- **Sorting**: `?sort=title,-createdAt`
- **Pagination**: `?page[size]=10&page[number]=2`
- **Filtering**: `?filter[published]=true&filter[author.name]=John`

### Request/Response Format

#### Creating a Resource
```bash
POST /posts
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "title": "My First Post",
      "content": "This is the content..."
    },
    "relationships": {
      "author": {
        "data": { "type": "users", "id": "1" }
      }
    }
  }
}
```

#### Response
```json
{
  "data": {
    "type": "posts",
    "id": "123",
    "attributes": {
      "title": "My First Post",
      "content": "This is the content..."
    },
    "relationships": {
      "author": {
        "data": { "type": "users", "id": "1" }
      }
    }
  }
}
```

#### Fetching with Includes
```bash
GET /posts?include=author&fields[posts]=title&fields[users]=name
```

```json
{
  "data": [
    {
      "type": "posts",
      "id": "123",
      "attributes": {
        "title": "My First Post"
      },
      "relationships": {
        "author": {
          "data": { "type": "users", "id": "1" }
        }
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "John Doe"
      }
    }
  ]
}
```

## Integration with SpectraGraph Stores

This server works with any SpectraGraph store implementation:

```javascript
// With Memory Store
import { MemoryStore } from "@spectragraph/memory-store";
const memoryStore = new MemoryStore(schema);
createServer(schema, memoryStore);

// With PostgreSQL Store  
import { PostgresStore } from "@spectragraph/postgres-store";
const pgStore = new PostgresStore(schema, { connectionString: "..." });
createServer(schema, pgStore);

// With JSON:API Store (proxy to another JSON:API server)
import { JSONAPIStore } from "@spectragraph/jsonapi-store";
const jsonApiStore = new JSONAPIStore(schema, { baseURL: "https://api.example.com" });
createServer(schema, jsonApiStore);
```

## Error Handling

The server automatically handles common error scenarios:

- **400 Bad Request**: Invalid JSON:API format or unknown resource types
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Store errors or unexpected exceptions

Errors are returned in JSON:API error format:

```json
{
  "errors": [
    {
      "status": "400",
      "title": "Invalid request",
      "description": "The request failed to pass the JSON:API schema validator",
      "meta": { "field": "/data/type", "message": "is required" }
    }
  ]
}
```

## Advanced Usage

### Custom Middleware

```javascript
import express from "express";
import { applySchemaRoutes } from "@spectragraph/jsonapi-server";

const app = express();
app.use(express.json());

// Add authentication middleware
app.use("/api", authenticateUser);

// Add JSON:API routes under /api prefix
const apiRouter = express.Router();
applySchemaRoutes(schema, store, apiRouter);
app.use("/api", apiRouter);

app.listen(3000);
```

### Custom Error Handling

```javascript
import { createJSONAPIHandlers } from "@spectragraph/jsonapi-server";

const handlers = createJSONAPIHandlers(schema, store);

// Wrap handlers with custom error handling
const wrappedHandler = (handler) => async (req, res, next) => {
	try {
		await handler(req, res);
	} catch (error) {
		console.error("Request failed:", error);
		res.status(500).json({
			errors: [{
				status: "500",
				title: "Internal Server Error",
				description: error.message
			}]
		});
	}
};

app.get("/posts", wrappedHandler(handlers.getAllHandler("posts")));
```

## Related Packages

- `@spectragraph/core` - Core SpectraGraph functionality
- `@spectragraph/memory-store` - In-memory store implementation
- `@spectragraph/postgres-store` - PostgreSQL store implementation
- `@spectragraph/jsonapi-store` - JSON:API client store