import { beforeAll, describe, expect, it } from "vitest";
import { Schema } from "data-prism";
import { randomBytes } from "node:crypto";
import { db } from "../global-setup.js";
import { careBearData } from "../fixtures/care-bear-data.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { reset } from "../../scripts/seed.js";
import { getDatabase } from "../helpers/db-helpers.js";

let db;
let store;

describe("upsert", () => {
	beforeAll(async () => {
		db = await getDatabase();
		store = createPostgresStore(careBearSchema as Schema, {
			...careBearConfig,
			db,
		});

		await reset(db, careBearSchema, careBearConfig, careBearData);
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
			const upsertedHome = await store.upsert({
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
					home: { type: "homes", id: upsertedHome.id },
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
			const upsertedBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Funshine Bear",
					yearIntroduced: 1982,
					bellyBadge: "yellow smiling sun",
					furColor: "golden yellow",
				},
			});

			const upsertedHome = await store.upsert({
				type: "homes",
				attributes: {
					name: "Hall of Hearts",
					caringMeter: 0.95,
					isInClouds: true,
				},
				relationships: {
					residents: [{ type: "bears", id: upsertedBear.id }],
				},
			});

			const homeResult = await store.query({
				type: "homes",
				id: upsertedHome.id,
				select: ["name", { residents: { select: ["name"] } }],
			});
			expect(homeResult).toEqual({
				name: "Hall of Hearts",
				residents: [{ name: "Funshine Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: upsertedBear.id,
				select: ["name", { home: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Funshine Bear",
				home: { name: "Hall of Hearts" },
			});
		});

		it("removes foreign relationships that are no longer present in the base resource", async () => {
			const upsertedHome = await store.upsert({
				type: "homes",
				attributes: {
					name: "Paradise Valley",
					caringMeter: 0.9,
					isInClouds: false,
				},
			});

			const oopsyBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Oopsy Bear",
					yearIntroduced: 2007,
					bellyBadge: "varied drawings",
					furColor: "light green",
				},
				relationships: {
					home: { type: "homes", id: upsertedHome.id },
				},
			});

			await store.upsert({
				type: "bears",
				attributes: {
					name: "Always There Bear",
					yearIntroduced: 2006,
					bellyBadge: "pink and lavender hearts",
					furColor: "red",
				},
				relationships: {
					home: { type: "homes", id: upsertedHome.id },
				},
			});

			const homeResult1 = await store.query({
				type: "homes",
				id: upsertedHome.id,
				select: ["name", { residents: { select: ["name"] } }],
			});
			expect(homeResult1).toEqual({
				name: "Paradise Valley",
				residents: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
			});

			await store.upsert({
				type: "homes",
				attributes: {
					name: "No Heart's Castle",
					caringMeter: 0,
					isInClouds: true,
				},
				relationships: {
					residents: [{ type: "bears", id: oopsyBear.id }],
				},
			});

			const homeResult2 = await store.query({
				type: "homes",
				id: upsertedHome.id,
				select: ["name", { residents: { select: ["name"] } }],
			});
			expect(homeResult2).toEqual({
				name: "Paradise Valley",
				residents: [{ name: "Always There Bear" }],
			});
		});

		it("upserts a single resource with a many-to-many relationship", async () => {
			const upsertedBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Secret Bear",
					yearIntroduced: 1985,
					bellyBadge: "red heart-shaped padlock",
					furColor: "magenta",
				},
			});

			const upsertedPower = await store.upsert({
				type: "powers",
				attributes: {
					name: "Care Cousins Call",
					description: "Just like the Care Bear Stare, but with the cousins.",
				},
				relationships: {
					wielders: [{ type: "bears", id: upsertedBear.id }],
				},
			});

			const powerResult = await store.query({
				type: "powers",
				id: upsertedPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect(powerResult).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Secret Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: upsertedBear.id,
				select: ["name", { powers: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Secret Bear",
				powers: [{ name: "Care Cousins Call" }],
			});
		});

		it("keeps many-to-many foreign relationships that belong to a second resource", async () => {
			const upsertedPower = await store.upsert({
				type: "powers",
				attributes: {
					name: "Care Cousins Call",
					description: "Just like the Care Bear Stare, but with the cousins.",
				},
			});

			const oopsyBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Oopsy Bear",
					yearIntroduced: 2007,
					bellyBadge: "varied drawings",
					furColor: "light green",
				},
				relationships: {
					powers: [{ type: "powers", id: upsertedPower.id }],
				},
			});

			await store.upsert({
				type: "bears",
				attributes: {
					name: "Always There Bear",
					yearIntroduced: 2006,
					bellyBadge: "pink and lavender hearts",
					furColor: "red",
				},
				relationships: {
					powers: [{ type: "powers", id: upsertedPower.id }],
				},
			});

			const powerResult1 = await store.query({
				type: "powers",
				id: upsertedPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect(powerResult1).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
			});

			await store.upsert({
				type: "powers",
				attributes: {
					name: "Fly",
				},
				relationships: {
					wielders: [{ type: "bears", id: oopsyBear.id }],
				},
			});

			const powerResult2 = await store.query({
				type: "powers",
				id: upsertedPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect(powerResult2).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Oopsy Bear" }, { name: "Always There Bear" }],
			});
		});
	});

	describe("update upserts", () => {
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

			await store.upsert({
				type: "bears",
				id: created.id,
				attributes: {
					bellyBadge: "yellow trophy with red star stamp",
				},
			});

			const result = await store.query({
				type: "bears",
				id: created.id,
				select: ["name", "bellyBadge"],
			});

			expect(result).toEqual({
				name: "Champ Bear",
				bellyBadge: "yellow trophy with red star stamp",
			});
		});

		it("fails to update a single resource with an invalid attribute", async () => {
			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Champ Bear",
					yearIntroduced: 1984,
					bellyBadge: "yellow trophy with red heart stamp",
					furColor: "cerulean",
				},
			});

			expect(
				store.upsert({
					type: "bears",
					id: created.id,
					attributes: {
						bellyBadge: 1999,
					},
				}),
			).rejects.toThrowError();
		});

		it("updates a single resource with only attributes, including a geometry attribute", async () => {
			const created = await store.create({
				type: "homes",
				attributes: {
					name: "Zanzibar",
				},
			});

			await store.upsert({
				type: "homes",
				id: created.id,
				attributes: {
					location: {
						type: "Point",
						coordinates: [39, 6],
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
					coordinates: [39, 6],
				},
			});
		});

		it("updates a single resource with only attributes, including a geometry attribute, with the geometry attribute coming from a get request", async () => {
			const created = await store.create({
				type: "homes",
				attributes: {
					name: "Zanzibar",
				},
			});

			await store.upsert({
				type: "homes",
				id: created.id,
				attributes: {
					location: {
						type: "Point",
						coordinates: [39, 6],
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
					coordinates: [39, 6],
				},
			});

			await store.upsert({
				type: "homes",
				id: created.id,
				attributes: {
					location: result.location,
				},
			});
		});

		it("updates a single resource with multiple attributes", async () => {
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
					yearIntroduced: 1985,
					bellyBadge: "yellow trophy with red star stamp",
				},
			});

			const result = await store.query({
				type: "bears",
				id: created.id,
				select: ["name", "bellyBadge", "yearIntroduced"],
			});

			expect(result).toEqual({
				name: "Champ Bear",
				yearIntroduced: 1985,
				bellyBadge: "yellow trophy with red star stamp",
			});
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

			await store.upsert({
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

		it("updates a single resource with a local relationship redundantly", async () => {
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
				relationships: {
					home: { type: "homes", id: createdHome.id },
				},
			});

			await store.upsert({
				type: "bears",
				id: created.id,
				attributes: { name: "Dare to Care Bear" },
			});

			await store.upsert({
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

			await store.upsert({
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

			const noHeartsCastle = await store.create({
				type: "homes",
				attributes: {
					name: "No Heart's Castle",
					caringMeter: 0,
					isInClouds: true,
				},
			});

			await store.upsert({
				type: "homes",
				id: noHeartsCastle.id,
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

			await store.upsert({
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

		it("updates a single resource with a many-to-many relationship with redunant updates", async () => {
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

			await store.upsert({
				type: "powers",
				id: createdPower.id,
				relationships: {
					wielders: [{ type: "bears", id: createdBear.id }],
				},
			});

			// redundant
			await store.upsert({
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

			await store.upsert({
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
});
