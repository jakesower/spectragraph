import { describe, it, expect, beforeEach } from "vitest";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { reset } from "../scripts/seed.js";

describe("postgres-store delete tests (go deeper than interface tests)", () => {
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

	it("deletes a single resource with a foreign to-one relationship", async () => {
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

		const homeResult = await store.query({
			type: "homes",
			id: createdHome.id,
			select: ["name", { residents: { select: ["name"] } }],
		});
		expect(homeResult).toEqual(null);

		const bearResult = await store.query({
			type: "bears",
			id: createdBear.id,
			select: ["name", { home: { select: ["name"] } }],
		});
		expect(bearResult).toEqual({ name: "Birthday Bear", home: null });

		const res = await db.query("SELECT * FROM bears WHERE id = $1", [
			createdBear.id,
		]);
		expect(res.rows[0].home_id).toEqual(null);
	});

	it("deletes all many-to-many foreign relationships that belong to a deleted resource", async () => {
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

		await store.create({
			type: "bears",
			attributes: {
				name: "Always There Bear",
				yearIntroduced: 2006,
				bellyBadge: "pink and lavender hearts",
				furColor: "red",
			},
			relationships: {
				powers: [{ type: "powers", id: createdPower.id }],
			},
		});

		const powerResultPre = await store.query({
			type: "powers",
			id: createdPower.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResultPre).toEqual({
			name: "Care Cousins Call",
			wielders: [{ name: "Share Bear" }, { name: "Always There Bear" }],
		});

		const createdPower2 = await store.create({
			type: "powers",
			attributes: {
				name: "Fly",
			},
			relationships: {
				wielders: [{ type: "bears", id: shareBear.id }],
			},
		});

		await store.delete({
			type: "bears",
			id: shareBear.id,
		});

		const powerResult1 = await store.query({
			type: "powers",
			id: createdPower.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResult1).toEqual({
			name: "Care Cousins Call",
			wielders: [{ name: "Always There Bear" }],
		});

		const powerResult2 = await store.query({
			type: "powers",
			id: createdPower2.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResult2).toEqual({
			name: "Fly",
			wielders: [],
		});

		const res = await db.query(
			"SELECT * FROM bears_powers WHERE bear_id = $1",
			[shareBear.id],
		);
		expect(res.rows.length).toEqual(0);
	});
});
