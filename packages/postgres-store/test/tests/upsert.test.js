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

describe("Upsert Tests", () => {
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

	describe("create upserts", () => {
		it("upserts a single resource with only attributes", async () => {
			const upserted = await store.upsert({
				type: "bears",
				attributes: {
					name: "Champ Bear",
					yearIntroduced: 1984,
					bellyBadge: "yellow trophy with red star",
					furColor: "cerulean",
				},
			});

			const result = await store.query({
				type: "bears",
				id: upserted.id,
				select: ["name"],
			});

			expect(result).toEqual({ name: "Champ Bear" });
		});

		it("fails to upsert a single resource with an invalid attribute", async () => {
			expect(
				store.upsert({
					type: "bears",
					attributes: { name: 1999 },
				}),
			).rejects.toThrowError();
		});

		it("upserts a single resource with an ID given", async () => {
			const id = randomBytes(20).toString("hex");

			await store.upsert({
				type: "bears",
				id,
				attributes: {
					name: "Watchful Bear",
					yearIntroduced: 2019,
					bellyBadge: "star with swirls",
					furColor: "pastel green",
				},
			});

			const result = await store.query({
				type: "bears",
				id,
				select: ["name"],
			});

			expect(result).toEqual({ name: "Watchful Bear" });
		});

		it("upserts a single resource with only attributes, including a geometry attribute", async () => {
			const upserted = await store.upsert({
				type: "homes",
				attributes: {
					name: "Zanzibar",
					location: {
						type: "Point",
						coordinates: [39, 6],
					},
				},
			});

			const result = await store.query({
				type: "homes",
				id: upserted.id,
				select: ["name", "location"],
			});

			expect(result).toEqual({
				name: "Zanzibar",
				location: {
					type: "Point",
					coordinates: [39, 6],
				},
			});
		});

		it("fails to upsert a single resource with an invalid geometry attribute", async () => {
			expect(
				store.upsert({
					type: "homes",
					attributes: {
						name: "Zanzibar",
						location: {
							type: "Point",
							coordinates: [39, 6, "chicken butt"],
						},
					},
				}),
			).rejects.toThrowError();
		});

		it("upserts a single resource with a local relationship", async () => {
			const createdHome = await store.create({
				type: "homes",
				attributes: {
					name: "Joke-a-Lot",
				},
			});

			const upserted = await store.upsert({
				type: "bears",
				attributes: {
					name: "Dare to Care Bear",
					yearIntroduced: 2023,
					bellyBadge: "yellow and blue smiling shooting stars",
					furColor: "orange, pink, purple, blue",
				},
				relationships: {
					home: { type: "homes", id: createdHome.id },
				},
			});

			const result = await store.query({
				type: "bears",
				id: upserted.id,
				select: ["name", { home: { select: ["name"] } }],
			});

			expect(result).toEqual({
				name: "Dare to Care Bear",
				home: { name: "Joke-a-Lot" },
			});
		});

		it("upserts a single resource with a foreign to-one relationship", async () => {
			const createdBear = await store.create({
				type: "bears",
				attributes: {
					name: "Funshine Bear",
					yearIntroduced: 1982,
					bellyBadge: "yellow smiling sun",
					furColor: "golden yellow",
				},
			});

			const upserted = await store.upsert({
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

			const homeResult = await store.query({
				type: "homes",
				id: upserted.id,
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

		it("upserts a single resource with a many-to-many relationship", async () => {
			const createdBear = await store.create({
				type: "bears",
				attributes: {
					name: "Secret Bear",
					yearIntroduced: 1985,
					bellyBadge: "red heart-shaped padlock",
					furColor: "magenta",
				},
			});

			const upserted = await store.upsert({
				type: "powers",
				attributes: {
					name: "Care Cousins Call",
					description: "Just like the Care Bear Stare, but with the cousins.",
				},
				relationships: {
					wielders: [{ type: "bears", id: createdBear.id }],
				},
			});

			const powerResult = await store.query({
				type: "powers",
				id: upserted.id,
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
	});

	describe("update upserts", () => {
		it("upserts a single resource with only attributes to update it", async () => {
			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Champ Bear",
					yearIntroduced: 1984,
					bellyBadge: "yellow trophy with red heart stamp",
					furColor: "cerulean",
				},
			});

			await store.upsert({
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
	});
});