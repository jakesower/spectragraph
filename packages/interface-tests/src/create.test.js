import { expect, it, describe, beforeAll } from "vitest";
import { careBearSchema } from "./fixtures/index.js";
import { checkOperationSupport } from "./test-helpers.js";

export function runCreateTests(createStore) {
	describe("Create Operations", () => {
		// Check if store supports create operations before running tests
		let storeSupportsCreate;

		beforeAll(async () => {
			storeSupportsCreate = await checkOperationSupport(
				createStore,
				careBearSchema,
				"create",
			);
			if (!storeSupportsCreate) {
				console.log(
					"Skipping Create Operations: Store does not support create operations",
				);
			}
		});

		it("creates a single resource with only attributes", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Grumpy Bear",
					yearIntroduced: 1982,
					bellyBadge: "blue storm cloud with raindrops",
					furColor: "blue",
				},
			});

			const result = await store.query({
				type: "bears",
				id: created.id,
				select: ["id", "name"],
			});

			expect(result).toEqual({ id: created.id, name: "Grumpy Bear" });
		});

		it("creates a single resource with a local relationship", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
			const createdHome = await store.create({
				type: "homes",
				attributes: {
					name: "Rainbow Falls",
				},
			});

			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Good Luck Bear",
					yearIntroduced: 1982,
					bellyBadge: "green four-leaf clover",
					furColor: "green",
				},
				relationships: {
					home: { type: "homes", id: createdHome.id },
				},
			});

			const result = await store.query({
				type: "bears",
				id: created.id,
				select: ["name", { home: ["name"] }],
			});

			expect(result).toEqual({
				name: "Good Luck Bear",
				home: { name: "Rainbow Falls" },
			});
		});

		it("creates a single resource with a foreign to-one relationship", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
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

			const homeResult = await store.query({
				type: "homes",
				id: createdHome.id,
				select: ["name", { residents: { select: ["name"] } }],
			});
			expect(homeResult).toEqual({
				name: "Hall of Hearts",
				residents: [{ name: "Birthday Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: createdBear.id,
				select: ["name", { home: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Birthday Bear",
				home: { name: "Hall of Hearts" },
			});
		});

		it("creates a single resource with a many-to-many relationship", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
			const createdBear = await store.create({
				type: "bears",
				attributes: {
					name: "Love-a-Lot Bear",
					yearIntroduced: 1982,
					bellyBadge: "two red hearts",
					furColor: "magenta",
				},
			});

			const createdPower = await store.create({
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
				id: createdPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect(powerResult).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Love-a-Lot Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: createdBear.id,
				select: ["name", { powers: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Love-a-Lot Bear",
				powers: [{ name: "Care Cousins Call" }],
			});
		});

		it("removes foreign relationships that are no longer present in the base resource", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
			const createdHome = await store.create({
				type: "homes",
				attributes: {
					name: "Paradise Valley",
					caringMeter: 0.9,
					isInClouds: false,
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
			expect({
				...homeResult1,
				residents: homeResult1.residents.sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			}).toEqual({
				name: "Paradise Valley",
				residents: [{ name: "Always There Bear" }, { name: "Share Bear" }],
			});

			await store.create({
				type: "homes",
				attributes: {
					name: "No Heart's Castle",
					caringMeter: 0,
					isInClouds: true,
				},
				relationships: {
					residents: [{ type: "bears", id: shareBear.id }],
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

		it("keeps many-to-many foreign relationships that belong to a second resource", async () => {
			if (!storeSupportsCreate) return;

			const store = createStore(careBearSchema);
			const createdPower = await store.create({
				type: "powers",
				attributes: {
					name: "Care Cousins Call",
					description: "Just like the Care Bear Stare, but with the cousins.",
				},
			});

			const harmonyBear = await store.create({
				type: "bears",
				attributes: {
					name: "Harmony Bear",
					yearIntroduced: 2007,
					bellyBadge: "rainbow musical note",
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

			const powerResult1 = await store.query({
				type: "powers",
				id: createdPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect({
				...powerResult1,
				wielders: powerResult1.wielders.sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			}).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Always There Bear" }, { name: "Harmony Bear" }],
			});

			await store.create({
				type: "powers",
				attributes: {
					name: "Fly",
				},
				relationships: {
					wielders: [{ type: "bears", id: harmonyBear.id }],
				},
			});

			const powerResult2 = await store.query({
				type: "powers",
				id: createdPower.id,
				select: ["name", { wielders: { select: ["name"] } }],
			});
			expect({
				...powerResult2,
				wielders: powerResult2.wielders.sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			}).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Always There Bear" }, { name: "Harmony Bear" }],
			});
		});

		describe("Flat Resource Format (overloaded signature)", () => {
			it("creates a resource with flat format (attributes at root)", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);
				const created = await store.create("bears", {
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "brown",
				});

				expect(created.type).toBe("bears");
				expect(created.id).toBeDefined();
				expect(created.attributes.name).toBe("Tenderheart Bear");

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", "furColor"],
				});

				expect(result).toEqual({
					name: "Tenderheart Bear",
					furColor: "brown",
				});
			});

			it("creates a resource with flat format and relationship as ID string", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				// Create home first
				const createdHome = await store.create("homes", {
					name: "Care-a-Lot",
					caringMeter: 0.99,
					isInClouds: true,
				});

				// Create bear with relationship as just an ID string
				const created = await store.create("bears", {
					name: "Cheer Bear",
					yearIntroduced: 1982,
					bellyBadge: "rainbow",
					furColor: "pink",
					home: createdHome.id, // Just the ID string
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", { home: ["name"] }],
				});

				expect(result).toEqual({
					name: "Cheer Bear",
					home: { name: "Care-a-Lot" },
				});
			});

			it("creates a resource with flat format and relationship as ref object", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				const createdHome = await store.create("homes", {
					name: "Forest of Feelings",
					caringMeter: 0.88,
					isInClouds: false,
				});

				// Create bear with relationship as {type, id} object
				const created = await store.create("bears", {
					name: "Funshine Bear",
					yearIntroduced: 1982,
					bellyBadge: "yellow smiling sun",
					furColor: "yellow",
					home: { type: "homes", id: createdHome.id },
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", { home: ["name"] }],
				});

				expect(result).toEqual({
					name: "Funshine Bear",
					home: { name: "Forest of Feelings" },
				});
			});

			it("creates a resource with flat format and to-many relationship", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				const power1 = await store.create("powers", {
					name: "Belly Badge Beam",
					description: "Projects caring energy",
					type: "offensive",
				});

				const power2 = await store.create("powers", {
					name: "Care Bear Stare",
					description: "Ultimate team attack",
					type: "offensive",
				});

				// Create bear with multiple powers
				const created = await store.create("bears", {
					name: "Brave Heart Lion",
					yearIntroduced: 1986,
					bellyBadge: "red heart with crown",
					furColor: "orange",
					powers: [power1.id, power2.id], // Array of ID strings
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", { powers: { select: ["name"] } }],
				});

				expect({
					...result,
					powers: result.powers.sort((a, b) => a.name.localeCompare(b.name)),
				}).toEqual({
					name: "Brave Heart Lion",
					powers: [{ name: "Belly Badge Beam" }, { name: "Care Bear Stare" }],
				});
			});

			it("creates a resource with flat format and mixed relationship formats", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				const home = await store.create("homes", {
					name: "Kingdom of Caring",
					caringMeter: 1.0,
					isInClouds: true,
				});

				const power = await store.create("powers", {
					name: "True Heart Symbol",
					description: "Symbol of pure caring",
					type: "passive",
				});

				// Mix ID string for home and ref object for powers
				const created = await store.create("bears", {
					name: "True Heart Bear",
					yearIntroduced: 1986,
					bellyBadge: "two interlocking hearts",
					furColor: "brown",
					home: home.id, // ID string
					powers: [{ type: "powers", id: power.id }], // Array of ref objects
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: [
						"name",
						{ home: ["name"] },
						{ powers: { select: ["name"] } },
					],
				});

				expect(result).toEqual({
					name: "True Heart Bear",
					home: { name: "Kingdom of Caring" },
					powers: [{ name: "True Heart Symbol" }],
				});
			});

			it("creates a resource with flat format with null relationship", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				const created = await store.create("bears", {
					name: "Wish Bear",
					yearIntroduced: 1982,
					bellyBadge: "shooting star",
					furColor: "teal",
					home: null, // Explicitly null
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", { home: "*" }],
				});

				expect(result).toEqual({
					name: "Wish Bear",
					home: null,
				});
			});

			it("creates a resource with flat format with empty to-many relationship", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				const created = await store.create("bears", {
					name: "Friend Bear",
					yearIntroduced: 1983,
					bellyBadge: "two daisies",
					furColor: "orange",
					powers: [], // Explicitly empty array
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", { powers: { select: ["name"] } }],
				});

				expect(result).toEqual({
					name: "Friend Bear",
					powers: [],
				});
			});

			it("continues to work with normalized format (backward compatibility)", async () => {
				if (!storeSupportsCreate) return;

				const store = createStore(careBearSchema);

				// Old normalized format should still work
				const created = await store.create({
					type: "bears",
					attributes: {
						name: "Bedtime Bear",
						yearIntroduced: 1983,
						bellyBadge: "crescent moon with star",
						furColor: "blue",
					},
				});

				const result = await store.query({
					type: "bears",
					id: created.id,
					select: ["name", "bellyBadge"],
				});

				expect(result).toEqual({
					name: "Bedtime Bear",
					bellyBadge: "crescent moon with star",
				});
			});
		});
	});
}
