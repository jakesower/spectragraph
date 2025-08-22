import { expect, it, describe } from "vitest";
import { careBearSchema } from "@data-prism/test-fixtures";

export function runCreateTests(storeFactory) {
	describe("Create Operations", () => {
		it("creates a single resource with only attributes", async () => {
			const store = storeFactory(careBearSchema);
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
			const store = storeFactory(careBearSchema);
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
				select: ["name", { home: { select: ["name"] } }],
			});

			expect(result).toEqual({
				name: "Good Luck Bear",
				home: { name: "Rainbow Falls" },
			});
		});

		it("creates a single resource with a foreign to-one relationship", async () => {
			const store = storeFactory(careBearSchema);
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
			const store = storeFactory(careBearSchema);
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
			const store = storeFactory(careBearSchema);
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
			expect(homeResult1).toEqual({
				name: "Paradise Valley",
				residents: [{ name: "Share Bear" }, { name: "Always There Bear" }],
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
			const store = storeFactory(careBearSchema);
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
			expect(powerResult1).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Harmony Bear" }, { name: "Always There Bear" }],
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
			expect(powerResult2).toEqual({
				name: "Care Cousins Call",
				wielders: [{ name: "Harmony Bear" }, { name: "Always There Bear" }],
			});
		});
	});
}