import { expect, it, describe, beforeAll } from "vitest";
import { careBearSchema } from "./fixtures/index.js";
import { checkOperationSupport } from "./test-helpers.js";

export function runUpdateTests(createStore) {
	describe("Update Operations", () => {
		// Check if store supports update operations before running tests
		let storeSupportsUpdate;
		
		beforeAll(async () => {
			storeSupportsUpdate = await checkOperationSupport(createStore, careBearSchema, 'update');
			if (!storeSupportsUpdate) {
				console.log('Skipping Update Operations: Store does not support update operations');
			}
		});
		it("updates a single resource with only attributes", async () => {
			if (!storeSupportsUpdate) return;
			
			const store = createStore(careBearSchema);
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

		it("updates a single resource with multiple attributes", async () => {
			if (!storeSupportsUpdate) return;
			
			const store = createStore(careBearSchema);
			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Bedtime Bear",
					yearIntroduced: 1984,
					bellyBadge: "white crescent moon with yellow star",
					furColor: "turquoise",
				},
			});

			await store.update({
				type: "bears",
				id: created.id,
				attributes: {
					yearIntroduced: 1985,
					bellyBadge: "white crescent moon with silver star",
				},
			});

			const result = await store.query({
				type: "bears",
				id: created.id,
				select: ["name", "yearIntroduced", "bellyBadge"],
			});

			expect(result).toEqual({
				name: "Bedtime Bear",
				yearIntroduced: 1985,
				bellyBadge: "white crescent moon with silver star",
			});
		});

		it("updates a single resource with a local relationship", async () => {
			if (!storeSupportsUpdate) return;
			
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
				name: "Good Luck Bear",
				home: { name: "Rainbow Falls" },
			});
		});

		it("updates a single resource with a local relationship redundantly", async () => {
			if (!storeSupportsUpdate) return;
			
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

			await store.update({
				type: "bears",
				id: created.id,
				relationships: {
					home: { type: "homes", id: createdHome.id },
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
				name: "Good Luck Bear",
				home: { name: "Rainbow Falls" },
			});
		});

		it("updates a single resource with a foreign to-one relationship", async () => {
			if (!storeSupportsUpdate) return;
			
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

		it("updates a single resource with a many-to-many relationship", async () => {
			if (!storeSupportsUpdate) return;
			
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

		it("updates a single resource with a many-to-many relationship with redundant updates", async () => {
			if (!storeSupportsUpdate) return;
			
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

			await store.update({
				type: "powers",
				id: createdPower.id,
				relationships: {
					wielders: [{ type: "bears", id: createdBear.id }],
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

		it("fails to update a single resource with a nonexistent ID", async () => {
			if (!storeSupportsUpdate) return;
			
			const store = createStore(careBearSchema);

			await expect(async () => {
				await store.update({
					type: "bears",
					id: "nonexistent-id",
					attributes: {
						name: "Watchful Bear",
						yearIntroduced: 2019,
						bellyBadge: "star with swirls",
						furColor: "pastel green",
					},
				});
			}).rejects.toThrowError();
		});

		it("fails to update a single resource with an invalid attribute", async () => {
			if (!storeSupportsUpdate) return;
			
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

			await expect(async () => {
				await store.update({
					type: "bears",
					id: created.id,
					attributes: {
						bellyBadge: 1999,
					},
				});
			}).rejects.toThrowError();
		});

		it("removes foreign relationships that are no longer present in the base resource", async () => {
			if (!storeSupportsUpdate) return;
			
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

			const noHeartsCastle = await store.create({
				type: "homes",
				attributes: {
					name: "No Heart's Castle",
					caringMeter: 0,
					isInClouds: true,
				},
			});

			await store.update({
				type: "homes",
				id: noHeartsCastle.id,
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
			if (!storeSupportsUpdate) return;
			
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
	});
}
