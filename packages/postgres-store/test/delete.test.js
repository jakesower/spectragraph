import { describe, it, expect, beforeEach } from "vitest";
import { createValidator } from "@data-prism/core"
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import geojsonSchema from "../../../schemas/geojson.schema.json" with { type: "json" };

describe("Delete Tests", () => {
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

it("deletes a single resource", async () => {
	const created = await store.create({
		type: "bears",
		attributes: {
			name: "Champ Bear",
			yearIntroduced: 1984,
			bellyBadge: "yellow trophy with red heart stamp",
			furColor: "cerulean",
		},
	});

	await store.delete({
		type: "bears",
		id: created.id,
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", "bellyBadge"],
	});

	expect(result).toEqual(null);
});

it("fails to delete an invalid resource", async () => {
	expect(store.delete({ type: "bears" })).rejects.toThrowError();
});

it("deletes a single resource with a local relationship", async () => {
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

	await store.delete({
		type: "bears",
		id: created.id,
	});

	const result = await store.query({
		type: "bears",
		id: created.id,
		select: ["name", { home: { select: ["name"] } }],
	});
	expect(result).toEqual(null);

	const result2 = await store.query({
		type: "homes",
		id: createdHome.id,
		select: { residents: { select: ["name"] } },
	});
	expect(result2).toEqual({ residents: [] });
});

it("deletes a single resource with a foreign to-one relationship", async () => {
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
		relationships: {
			residents: [{ type: "bears", id: createdBear.id }],
		},
	});

	await store.delete({
		type: "bears",
		id: createdBear.id,
	});

	const homeResult = await store.query({
		type: "homes",
		id: createdHome.id,
		select: ["name", { residents: { select: ["name"] } }],
	});
	expect(homeResult).toEqual({
		name: "Hall of Hearts",
		residents: [],
	});

	const bearResult = await store.query({
		type: "bears",
		id: createdBear.id,
		select: ["name", { home: { select: ["name"] } }],
	});
	expect(bearResult).toEqual(null);
});

it("deletes all many-to-many foreign relationships that belong to a deleted resource", async () => {
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
		wielders: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
	});

	const createdPower2 = await store.create({
		type: "powers",
		attributes: {
			name: "Fly",
		},
		relationships: {
			wielders: [{ type: "bears", id: oopsyBear.id }],
		},
	});

	await store.delete({
		type: "bears",
		id: oopsyBear.id,
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
});

});