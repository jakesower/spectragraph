import { expect, it, describe, beforeAll } from "vitest";
import { careBearSchema } from "./fixtures/index.js";
import { checkOperationSupport } from "./test-helpers.js";

export function runDeleteTests(createStore) {
	describe("Delete Operations", () => {
		// Check if store supports delete operations before running tests
		let storeSupportsDelete;
		
		beforeAll(async () => {
			storeSupportsDelete = await checkOperationSupport(createStore, careBearSchema, 'delete');
			if (!storeSupportsDelete) {
				console.log('Skipping Delete Operations: Store does not support delete operations');
			}
		});
		it("deletes a single resource", async () => {
			if (!storeSupportsDelete) return;
			
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

		it("deletes a single resource with a local relationship", async () => {
			if (!storeSupportsDelete) return;
			
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

		it("deletes a single resource with a to-one relationship created on the foreign resource", async () => {
			if (!storeSupportsDelete) return;
			
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

		it("deletes a single resource with a foreign to-one relationship", async () => {
			if (!storeSupportsDelete) return;
			
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
		});

		it("deletes all many-to-many foreign relationships that belong to a deleted resource", async () => {
			if (!storeSupportsDelete) return;
			
			const store = createStore(careBearSchema);
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
		});
	});
}
