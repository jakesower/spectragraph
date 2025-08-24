import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import { reset } from "../scripts/seed.js";

describe("Create Tests", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);

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
