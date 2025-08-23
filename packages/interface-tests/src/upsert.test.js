import { expect, it, describe } from "vitest";
import { careBearSchema } from "./fixtures/index.js";

export function runUpsertTests(createStore) {
	describe("Upsert Operations", () => {
		it("creates a single resource with upsert", async () => {
			const store = createStore(careBearSchema);
			const upserted = await store.upsert({
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
				id: upserted.id,
				select: ["name"],
			});

			expect(result).toEqual({ name: "Grumpy Bear" });
		});

		it("updates a single resource with upsert", async () => {
			const store = createStore(careBearSchema);
			const created = await store.create({
				type: "bears",
				attributes: {
					name: "Grumpy Bear",
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
				name: "Grumpy Bear",
				bellyBadge: "yellow trophy with red star stamp",
			});
		});

		it("upserts a single resource with a local relationship", async () => {
			const store = createStore(careBearSchema);
			const upsertedHome = await store.upsert({
				type: "homes",
				attributes: {
					name: "Rainbow Falls",
				},
			});

			const upserted = await store.upsert({
				type: "bears",
				attributes: {
					name: "Good Luck Bear",
					yearIntroduced: 1982,
					bellyBadge: "green four-leaf clover",
					furColor: "green",
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
				name: "Good Luck Bear",
				home: { name: "Rainbow Falls" },
			});
		});

		it("upserts a single resource with a foreign to-one relationship", async () => {
			const store = createStore(careBearSchema);
			const upsertedBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Birthday Bear",
					yearIntroduced: 1984,
					bellyBadge: "pink cupcake with candle",
					furColor: "pink",
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
				residents: [{ name: "Birthday Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: upsertedBear.id,
				select: ["name", { home: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Birthday Bear",
				home: { name: "Hall of Hearts" },
			});
		});

		it("upserts a single resource with a many-to-many relationship", async () => {
			const store = createStore(careBearSchema);
			const upsertedBear = await store.upsert({
				type: "bears",
				attributes: {
					name: "Love-a-Lot Bear",
					yearIntroduced: 1982,
					bellyBadge: "two red hearts",
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
				wielders: [{ name: "Love-a-Lot Bear" }],
			});

			const bearResult = await store.query({
				type: "bears",
				id: upsertedBear.id,
				select: ["name", { powers: { select: ["name"] } }],
			});
			expect(bearResult).toEqual({
				name: "Love-a-Lot Bear",
				powers: [{ name: "Care Cousins Call" }],
			});
		});

		it("upserts a single resource with an ID given", async () => {
			const store = createStore(careBearSchema);
			const customId = "custom-bear-id-123";

			await store.upsert({
				type: "bears",
				id: customId,
				attributes: {
					name: "Watchful Bear",
					yearIntroduced: 2019,
					bellyBadge: "star with swirls",
					furColor: "pastel green",
				},
			});

			const result = await store.query({
				type: "bears",
				id: customId,
				select: ["name"],
			});

			expect(result).toEqual({ name: "Watchful Bear" });
		});

		it("fails to upsert a single resource with an invalid attribute", async () => {
			const store = createStore(careBearSchema);
			
			await expect(async () =>
				store.upsert({
					type: "bears",
					attributes: { name: 1999 },
				}),
			).rejects.toThrowError();
		});
	});
}