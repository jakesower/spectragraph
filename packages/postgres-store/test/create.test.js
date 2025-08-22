import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
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

	it("creates a single resource with only attributes", async () => {
		const created = await store.create({
			type: "bears",
			attributes: {
				name: "Champ Bear",
				yearIntroduced: 1984,
				bellyBadge: "trophy",
				furColor: "yellow",
			},
		});

		expect(created.type).toBe("bears");
		expect(created.id).toBeDefined();
		expect(created.attributes.name).toBe("Champ Bear");
		expect(created.attributes.yearIntroduced).toBe(1984);
		expect(created.attributes.bellyBadge).toBe("trophy");
		expect(created.attributes.furColor).toBe("yellow");
		expect(created.relationships).toBeDefined();
	});

	it("creates a single resource with relationships", async () => {
		// First create a bear to reference
		const referenceBear = await store.create({
			type: "bears",
			attributes: {
				name: "Reference Bear",
				yearIntroduced: 1983,
				bellyBadge: "reference",
				furColor: "blue",
			},
		});

		const created = await store.create({
			type: "bears",
			attributes: {
				name: "Friend Bear",
				yearIntroduced: 1984,
				bellyBadge: "friendship",
				furColor: "orange",
			},
			relationships: {
				bestFriend: { type: "bears", id: referenceBear.id },
			},
		});

		expect(created.type).toBe("bears");
		expect(created.id).toBeDefined();
		expect(created.attributes.name).toBe("Friend Bear");
		expect(created.relationships.bestFriend).toEqual({
			type: "bears",
			id: referenceBear.id,
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