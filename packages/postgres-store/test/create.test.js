import { randomBytes } from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { getClient, initializeClient } from "./get-client.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";

// Most create tests are covered by interface-tests via interface.test.js
// This file contains PostgreSQL-specific create functionality tests

describe("PostgreSQL-Specific Create Tests", () => {
	let store;
	let db;

	beforeAll(async () => {
		await initializeClient();
	});

	beforeEach(() => {
		db = getClient();

		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
		});
	});


	it("creates a resource with generated ID", async () => {
		const created = await store.create({
			type: "bears",
			attributes: {
				name: "Auto ID Bear",
				yearIntroduced: 1985,
				bellyBadge: "auto",
				furColor: "green",
			},
		});

		expect(created.id).toBeDefined();
		expect(typeof created.id).toBe("string");
		expect(created.id.length).toBeGreaterThan(0);
	});

	it("creates a resource with specific ID", async () => {
		const customId = randomBytes(16).toString("hex");

		const created = await store.create({
			type: "bears",
			id: customId,
			attributes: {
				name: "Custom ID Bear",
				yearIntroduced: 1986,
				bellyBadge: "custom",
				furColor: "purple",
			},
		});

		expect(created.id).toBe(customId);
		expect(created.attributes.name).toBe("Custom ID Bear");
	});
});
