# PostgresStore Test Setup

This package uses testcontainers to automatically manage PostgreSQL instances during testing.

## Prerequisites

- Docker installed and running
- Node.js 18+

## Quick Start

Just run the tests - everything is automatic:

```bash
npm test
```

## How It Works

The test setup automatically:

1. **Starts a PostgreSQL container** with PostGIS extensions
2. **Seeds test data** using your care bear fixtures
3. **Runs your tests** with a fresh database instance
4. **Cleans up** the container when tests complete

## Writing Tests

### Option 1: Using Global Setup

Tests that rely on the global setup and seeded data:

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";

describe("PostgresStore", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		store = createPostgresStore(schema, { db, ...config });
	});

	it("should work with seeded data", async () => {
		const bears = await store.getAll("bears");
		expect(bears.length).toBeGreaterThan(0);
	});
});
```

### Option 2: Direct Container Management (Edge Cases Only)

Tests that need full control over the database lifecycle:

```javascript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestDb, stopTestDb } from "./test-db-setup.js";

describe("Custom Setup", () => {
	let db;

	beforeAll(async () => {
		const result = await startTestDb();
		db = result.db;
		// Custom setup here
	});

	afterAll(async () => {
		await stopTestDb();
	});

	it("should work with custom setup", async () => {
		const result = await db.query("SELECT 1");
		expect(result.rows[0]).toEqual({ "?column?": 1 });
	});
});
```

## Container Details

- **Image**: `postgis/postgis:15-3.3`
- **Database**: `test_db`
- **User**: `test_user`
- **Password**: `test_password`
- **Extensions**: UUID, PostGIS

## Configuration

The setup is configured in `test/test-db-setup.js`. You can modify:

- PostgreSQL version/image
- Database credentials
- Wait strategies
- Extensions loaded

## Troubleshooting

### Docker Issues

```bash
# Check if Docker is running
docker info

# Start Docker daemon
# (varies by system - Docker Desktop, systemctl, etc.)
```

### Container Startup Issues

```bash
# Run tests with more verbose output
npm test -- --reporter=verbose

# Check container logs
docker logs <container_id>
```

### Test Timeouts

The setup includes 30-second timeouts for container operations. If you need longer:

```javascript
// In vitest.config.js
export default defineConfig({
	test: {
		testTimeout: 60000, // 60 seconds
		hookTimeout: 60000, // 60 seconds
	},
});
```

## Environment Variables

No environment variables needed - everything is self-contained!

## Sample Tests

See `test/simple-direct.test.js` for a working example of:

- Basic database connectivity
- Extension availability (UUID, PostGIS)
- Table creation and queries

The setup is production-ready and provides isolated, reliable test environments.
