import { describe, expect, it, beforeEach } from "vitest";
import { createValidator } from "@data-prism/core";
import { randomBytes } from "node:crypto";
import { getClient } from "../get-client.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { careBearData } from "../fixtures/care-bear-data.js";
import { reset } from "../../scripts/seed.js";
import geojsonSchema from "../../../../schemas/geojson.schema.json" with { type: "json" };

describe("Update Tests", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);
		
		const validator = createValidator({ schemas: [geojsonSchema] });
		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
			validator,
		});
	});

	it("updates a single resource with only attributes", async () => {
		const created = await store.create({
			type: "bears",
			attributes: {
				name: "Champ Bear",
				yearIntroduced: 1984,
				bellyBadge: "yellow trophy with red heart stamp",
				furColor: "cerulean",
			},
		});

		await store.update({
			type: "bears",
			id: created.id,
			attributes: {
				bellyBadge: "yellow trophy with red star",
			},
		});

		const result = await store.query({
			type: "bears",
			id: created.id,
			select: ["name", "bellyBadge"],
		});

		expect(result).toEqual({
			name: "Champ Bear",
			bellyBadge: "yellow trophy with red star",
		});
	});

	it("fails to update an invalid resource", async () => {
		expect(store.update({ type: "bears" })).rejects.toThrowError();
	});

	it("updates a single resource with an ID given", async () => {
		const id = randomBytes(20).toString("hex");

		await store.create({
			type: "bears",
			id,
			attributes: {
				name: "Watchful Bear",
				yearIntroduced: 2019,
				bellyBadge: "star with swirls",
				furColor: "pastel green",
			},
		});

		await store.update({
			type: "bears",
			id,
			attributes: {
				bellyBadge: "star without swirls",
			},
		});

		const result = await store.query({
			type: "bears",
			id,
			select: ["name", "bellyBadge"],
		});

		expect(result).toEqual({
			name: "Watchful Bear",
			bellyBadge: "star without swirls",
		});
	});

	it("updates a single resource with only attributes, including a geometry attribute", async () => {
		const created = await store.create({
			type: "homes",
			attributes: {
				name: "Zanzibar",
				location: {
					type: "Point",
					coordinates: [39, 6],
				},
			},
		});

		await store.update({
			type: "homes",
			id: created.id,
			attributes: {
				location: {
					type: "Point",
					coordinates: [40, 7],
				},
			},
		});

		const result = await store.query({
			type: "homes",
			id: created.id,
			select: ["name", "location"],
		});

		expect(result).toEqual({
			name: "Zanzibar",
			location: {
				type: "Point",
				coordinates: [40, 7],
			},
		});
	});

	it("fails to update a single resource with an invalid geometry attribute", async () => {
		const created = await store.create({
			type: "homes",
			attributes: {
				name: "Zanzibar",
			},
		});

		expect(
			store.update({
				type: "homes",
				id: created.id,
				attributes: {
					location: {
						type: "Point",
						coordinates: [39, 6, "chicken butt"],
					},
				},
			}),
		).rejects.toThrowError();
	});

	it("updates a single resource with a local relationship", async () => {
		const createdHome = await store.create({
			type: "homes",
			attributes: {
				name: "Joke-a-Lot",
			},
		});

		const created = await store.create({
			type: "bears",
			attributes: {
				name: "Dare to Care Bear",
				yearIntroduced: 2023,
				bellyBadge: "yellow and blue smiling shooting stars",
				furColor: "orange, pink, purple, blue",
			},
		});

		await store.update({
			type: "bears",
			id: created.id,
			relationships: {
				home: { type: "homes", id: createdHome.id },
			},
		});

		const result = await store.query({
			type: "bears",
			id: created.id,
			select: ["name", { home: { select: ["name"] } }],
		});

		expect(result).toEqual({
			name: "Dare to Care Bear",
			home: { name: "Joke-a-Lot" },
		});
	});

	it("updates a single resource with a foreign to-one relationship", async () => {
		const createdBear = await store.create({
			type: "bears",
			attributes: {
				name: "Funshine Bear",
				yearIntroduced: 1982,
				bellyBadge: "yellow smiling sun",
				furColor: "golden yellow",
			},
		});

		const createdHome = await store.create({
			type: "homes",
			attributes: {
				name: "Hall of Hearts",
				caringMeter: 0.95,
				isInClouds: true,
			},
		});

		await store.update({
			type: "homes",
			id: createdHome.id,
			relationships: {
				residents: [{ type: "bears", id: createdBear.id }],
			},
		});

		const homeResult = await store.query({
			type: "homes",
			id: createdHome.id,
			select: ["name", { residents: { select: ["name"] } }],
		});
		expect(homeResult).toEqual({
			name: "Hall of Hearts",
			residents: [{ name: "Funshine Bear" }],
		});

		const bearResult = await store.query({
			type: "bears",
			id: createdBear.id,
			select: ["name", { home: { select: ["name"] } }],
		});
		expect(bearResult).toEqual({
			name: "Funshine Bear",
			home: { name: "Hall of Hearts" },
		});
	});

	it("removes foreign relationships that are no longer present in the base resource", async () => {
		const createdHome = await store.create({
			type: "homes",
			attributes: {
				name: "Paradise Valley",
				caringMeter: 0.9,
				isInClouds: false,
			},
		});

		const oopsyBear = await store.create({
			type: "bears",
			attributes: {
				name: "Oopsy Bear",
				yearIntroduced: 2007,
				bellyBadge: "varied drawings",
				furColor: "light green",
			},
			relationships: {
				home: { type: "homes", id: createdHome.id },
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
				home: { type: "homes", id: createdHome.id },
			},
		});

		const homeResult1 = await store.query({
			type: "homes",
			id: createdHome.id,
			select: ["name", { residents: { select: ["name"] } }],
		});
		expect(homeResult1).toEqual({
			name: "Paradise Valley",
			residents: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
		});

		const createdHome2 = await store.create({
			type: "homes",
			attributes: {
				name: "No Heart's Castle",
				caringMeter: 0,
				isInClouds: true,
			},
		});

		await store.update({
			type: "homes",
			id: createdHome2.id,
			relationships: {
				residents: [{ type: "bears", id: oopsyBear.id }],
			},
		});

		const homeResult2 = await store.query({
			type: "homes",
			id: createdHome.id,
			select: ["name", { residents: { select: ["name"] } }],
		});
		expect(homeResult2).toEqual({
			name: "Paradise Valley",
			residents: [{ name: "Always There Bear" }],
		});
	});

	it("updates a single resource with a many-to-many relationship", async () => {
		const createdBear = await store.create({
			type: "bears",
			attributes: {
				name: "Secret Bear",
				yearIntroduced: 1985,
				bellyBadge: "red heart-shaped padlock",
				furColor: "magenta",
			},
		});

		const createdPower = await store.create({
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		});

		await store.update({
			type: "powers",
			id: createdPower.id,
			relationships: {
				wielders: [{ type: "bears", id: createdBear.id }],
			},
		});

		const powerResult = await store.query({
			type: "powers",
			id: createdPower.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResult).toEqual({
			name: "Care Cousins Call",
			wielders: [{ name: "Secret Bear" }],
		});

		const bearResult = await store.query({
			type: "bears",
			id: createdBear.id,
			select: ["name", { powers: { select: ["name"] } }],
		});
		expect(bearResult).toEqual({
			name: "Secret Bear",
			powers: [{ name: "Care Cousins Call" }],
		});
	});

	it("keeps many-to-many foreign relationships that belong to a second resource", async () => {
		const createdPower = await store.create({
			type: "powers",
			attributes: {
				name: "Care Cousins Call",
				description: "Just like the Care Bear Stare, but with the cousins.",
			},
		});

		const oopsyBear = await store.create({
			type: "bears",
			attributes: {
				name: "Oopsy Bear",
				yearIntroduced: 2007,
				bellyBadge: "varied drawings",
				furColor: "light green",
			},
			relationships: {
				powers: [{ type: "powers", id: createdPower.id }],
			},
		});

		const alwaysThereBear = await store.create({
			type: "bears",
			attributes: {
				name: "Always There Bear",
				yearIntroduced: 2006,
				bellyBadge: "pink and lavender hearts",
				furColor: "red",
			},
		});

		await store.update({
			type: "bears",
			id: alwaysThereBear.id,
			relationships: {
				powers: [{ type: "powers", id: createdPower.id }],
			},
		});

		const powerResult1 = await store.query({
			type: "powers",
			id: createdPower.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResult1).toEqual({
			name: "Care Cousins Call",
			wielders: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
		});

		const createdPower2 = await store.create({
			type: "powers",
			attributes: {
				name: "Fly",
			},
		});

		await store.update({
			type: "powers",
			id: createdPower2.id,
			relationships: {
				wielders: [{ type: "bears", id: oopsyBear.id }],
			},
		});

		const powerResult2 = await store.query({
			type: "powers",
			id: createdPower.id,
			select: ["name", { wielders: { select: ["name"] } }],
		});
		expect(powerResult2).toEqual({
			name: "Care Cousins Call",
			wielders: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
		});
	});
});