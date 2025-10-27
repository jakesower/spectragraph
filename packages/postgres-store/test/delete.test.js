import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { getClient, initializeClient } from "./get-client.js";

// Most delete tests are covered by interface-tests via interface.test.js
// This file contains PostgreSQL-specific database-level verification tests

describe("PostgreSQL-Specific Delete Tests", () => {
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


	it("verifies foreign key nullification at database level", async () => {
		const createdBear = await store.create({
			type: "bears",
			attributes: {
				name: "Birthday Bear",
				yearIntroduced: 1984,
				bellyBadge: "pink cupcake with candle",
				furColor: "pink",
			},
		});

		const createdHome = await store.create({
			type: "homes",
			attributes: {
				name: "Hall of Hearts",
				caringMeter: 0.95,
				isInClouds: true,
			},
			relationships: {
				residents: [{ type: "bears", id: createdBear.id }],
			},
		});

		await store.delete({
			type: "homes",
			id: createdHome.id,
		});

		// Verify database state directly - this is postgres-specific verification
		const res = await db.query("SELECT home_id FROM bears WHERE id = $1", [
			createdBear.id,
		]);
		expect(res.rows[0].home_id).toEqual(null);
	});

	it("verifies many-to-many junction table cleanup at database level", async () => {
		const createdPower = await store.create({
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		});

		const shareBear = await store.create({
			type: "bears",
			attributes: {
				name: "Share Bear",
				yearIntroduced: 1988,
				bellyBadge: "two ice cream sundaes",
				furColor: "lavender",
			},
			relationships: {
				powers: [{ type: "powers", id: createdPower.id }],
			},
		});

		await store.delete({
			type: "bears",
			id: shareBear.id,
		});

		// Verify junction table cleanup directly - this is postgres-specific verification
		const res = await db.query(
			"SELECT * FROM bears_powers WHERE bear_id = $1",
			[shareBear.id],
		);
		expect(res.rows.length).toEqual(0);
	});
});
