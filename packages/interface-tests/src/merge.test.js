import { describe, test, expect, beforeEach } from "vitest";
import { careBearSchema } from "./fixtures/index.js";

/**
 * Runs the shared merge operation tests across different store implementations
 * @param {function} createStore - Factory function that creates a store instance
 */
export function runMergeTests(createStore) {
	describe("Merge Operations", () => {
		let store;

		beforeEach(() => {
			store = createStore(careBearSchema, { initialData: {} });
		});

		test("should handle single resource merge", async () => {
			const result = await store.merge({
				type: "bears",
				attributes: {
					name: "Funshine Bear",
					bellyBadge: "smiling sun",
					furColor: "yellow",
					yearIntroduced: 1982,
				},
			});

			// Should return single result for backward compatibility
			expect(Array.isArray(result)).toBe(false);
			expect(result.attributes.name).toBe("Funshine Bear");
			expect(result.attributes.bellyBadge).toBe("smiling sun");
		});

		test("should handle multiple resource merge", async () => {
			const results = await store.merge([
				{
					type: "bears",
					attributes: {
						name: "Funshine Bear",
						bellyBadge: "smiling sun",
						furColor: "yellow",
						yearIntroduced: 1982,
					},
				},
				{
					type: "bears",
					attributes: {
						name: "Cheer Bear",
						bellyBadge: "rainbow",
						furColor: "pink",
						yearIntroduced: 1982,
					},
				},
			]);

			expect(results.length).toBe(2);
			expect(results[0].attributes.name).toBe("Funshine Bear");
			expect(results[1].attributes.name).toBe("Cheer Bear");

			// Verify each created bear individually
			const funshine = await store.query({
				type: "bears",
				id: results[0].id,
				select: ["name", "bellyBadge"],
			});
			expect(funshine.bellyBadge).toBe("smiling sun");

			const cheer = await store.query({
				type: "bears",
				id: results[1].id,
				select: ["name", "bellyBadge"],
			});
			expect(cheer.bellyBadge).toBe("rainbow");
		});

		test("should handle failed merge", async () => {
			const existingBear = await store.create({
				type: "bears",
				attributes: {
					name: "Tenderheart Bear",
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
					yearIntroduced: 1982,
				},
			});

			await expect(async () => {
				await store.merge([
					{
						type: "bears",
						attributes: {
							name: "Grumpy Bear",
							bellyBadge: "storm cloud with hearts",
							furColor: "blue",
							yearIntroduced: 1982,
						},
					},
					{
						type: "bears",
						attributes: {
							name: "Shadow Bear",
							bellyBadge: "broken heart",
							furColor: "black",
							yearIntroduced: "the year of darkness", // invalid
						},
					},
				]);
			}).rejects.toThrow();

			// Verify the original bear still exists
			const protectedBear = await store.query({
				type: "bears",
				id: existingBear.id,
				select: ["name", "bellyBadge"],
			});
			expect(protectedBear.name).toBe("Tenderheart Bear");
		});

		test("should handle empty array", async () => {
			const result = await store.merge([]);
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});

		test("should handle mixed single and batch operations", async () => {
			const bedtimeBear = await store.create({
				type: "bears",
				attributes: {
					name: "Bedtime Bear",
					bellyBadge: "crescent moon and star",
					furColor: "turquoise",
					yearIntroduced: 1985,
				},
			});

			const batchResults = await store.merge([
				{
					type: "bears",
					attributes: {
						name: "Good Luck Bear",
						bellyBadge: "four-leaf clover",
						furColor: "green",
						yearIntroduced: 1982,
					},
				},
				{
					type: "bears",
					attributes: {
						name: "Wish Bear",
						bellyBadge: "shooting star",
						furColor: "light blue",
						yearIntroduced: 1985,
					},
				},
			]);

			const birthdayBear = await store.merge({
				type: "bears",
				attributes: {
					name: "Birthday Bear",
					bellyBadge: "pink cupcake with candle",
					furColor: "pink",
					yearIntroduced: 1984,
				},
			});

			// Verify each bear individually rather than querying all
			const bedtime = await store.query({
				type: "bears",
				id: bedtimeBear.id,
				select: ["name", "yearIntroduced"],
			});
			expect(bedtime.yearIntroduced).toBe(1985);

			const goodLuck = await store.query({
				type: "bears",
				id: batchResults[0].id,
				select: ["name", "bellyBadge"],
			});
			expect(goodLuck.bellyBadge).toBe("four-leaf clover");

			const birthday = await store.query({
				type: "bears",
				id: birthdayBear.id,
				select: ["name", "bellyBadge"],
			});
			expect(birthday.bellyBadge).toBe("pink cupcake with candle");
		});

		test("should handle create then update in single merge", async () => {
			const results = await store.merge([
				{
					type: "bears",
					attributes: {
						name: "Love-a-Lot Bear",
						bellyBadge: "two pink hearts",
						furColor: "magenta",
						yearIntroduced: 1982,
					},
				},
			]);

			const loveALot = results[0];

			const updatedResults = await store.merge([
				{
					type: "bears",
					id: loveALot.id,
					attributes: {
						bellyBadge: "two sparkling pink hearts with rainbow outline",
					},
				},
			]);

			const glammedUp = updatedResults[0];

			// Verify the specific updated bear rather than querying all
			const verifiedBear = await store.query({
				type: "bears",
				id: loveALot.id,
				select: ["name", "bellyBadge"],
			});

			expect(glammedUp.attributes.bellyBadge).toBe(
				"two sparkling pink hearts with rainbow outline",
			);
			expect(verifiedBear.bellyBadge).toBe(
				"two sparkling pink hearts with rainbow outline",
			);
			expect(verifiedBear.name).toBe("Love-a-Lot Bear");
		});

		test("should merge a single resource with only attributes", async () => {
			const bedtimeBear = await store.merge({
				type: "bears",
				attributes: {
					name: "Bedtime Bear",
					yearIntroduced: 1984,
					bellyBadge: "white crescent moon with yellow star",
					furColor: "turquoise",
				},
			});

			const bedtimeBearResult = await store.query({
				type: "bears",
				id: bedtimeBear.id,
				select: ["name"],
			});

			expect(bedtimeBearResult).toEqual({ name: "Bedtime Bear" });
		});

		test("should update a single resource with only attributes", async () => {
			const friendBear = await store.create({
				type: "bears",
				attributes: {
					name: "Friend Bear",
					yearIntroduced: 1982,
					bellyBadge: "two yellow smiling flowers",
					furColor: "orange",
				},
			});

			await store.merge({
				type: "bears",
				id: friendBear.id,
				attributes: {
					bellyBadge: "two yellow smiling flowers with hearts",
				},
			});

			const friendBearResult = await store.query({
				type: "bears",
				id: friendBear.id,
				select: ["name", "bellyBadge"],
			});

			expect(friendBearResult).toEqual({
				name: "Friend Bear",
				bellyBadge: "two yellow smiling flowers with hearts",
			});
		});

		test("should update a single resource with attributes and relationships", async () => {
			const careALot = await store.create({
				type: "homes",
				attributes: {
					name: "Care-a-Lot",
				},
			});

			const cloudForest = await store.create({
				type: "homes",
				attributes: {
					name: "Cloud Forest",
				},
			});

			const friendBear = await store.create({
				type: "bears",
				attributes: {
					name: "Friend Bear",
					yearIntroduced: 1982,
					bellyBadge: "two yellow smiling flowers",
					furColor: "orange",
				},
				relationships: { home: { type: "homes", id: careALot.id } },
			});

			const careALotBefore = await store.query({
				type: "homes",
				id: careALot.id,
				select: ["name", { residents: { select: ["name"] } }],
			});

			expect(careALotBefore).toEqual({
				name: "Care-a-Lot",
				residents: [{ name: "Friend Bear" }],
			});

			await store.merge({
				type: "bears",
				id: friendBear.id,
				attributes: {
					bellyBadge: "two yellow smiling flowers with hearts",
				},
				relationships: { home: { type: "homes", id: cloudForest.id } },
			});

			const friendBearAfter = await store.query({
				type: "bears",
				id: friendBear.id,
				select: ["name", "bellyBadge", { home: { select: ["name"] } }],
			});

			expect(friendBearAfter).toEqual({
				name: "Friend Bear",
				bellyBadge: "two yellow smiling flowers with hearts",
				home: { name: "Cloud Forest" },
			});

			const careALotAfter = await store.query({
				type: "homes",
				id: careALot.id,
				select: ["name", { residents: { select: ["name"] } }],
			});

			expect(careALotAfter).toEqual({ name: "Care-a-Lot", residents: [] });
		});

		test("should create resources in a tree and properly relate them", async () => {
			const careALotBear = await store.merge({
				type: "bears",
				attributes: {
					name: "Care-a-Lot Bear",
					yearIntroduced: 2022,
					bellyBadge: "Care-a-Lot Castle with a rainbow",
					furColor: "purple/pink/light blue",
				},
				relationships: {
					home: {
						type: "homes",
						attributes: {
							name: "Care-a-Lot Castle",
							caringMeter: 1,
						},
					},
				},
			});

			const careALotBearResult = await store.query({
				type: "bears",
				id: careALotBear.id,
				select: ["yearIntroduced", { home: { select: ["name"] } }],
			});

			expect(careALotBearResult).toEqual({
				yearIntroduced: 2022,
				home: { name: "Care-a-Lot Castle" },
			});
		});

		test.skip("should fail to create a resource with a nonexistent ref", async () => {
			await expect(async () => {
				await store.merge({
					type: "bears",
					attributes: {
						name: "Care-a-Lot Bear",
						yearIntroduced: 2022,
						bellyBadge: "Care-a-Lot Castle with a rainbow",
						furColor: "purple/pink/light blue",
					},
					relationships: {
						home: { type: "homes", id: "uh oh" },
					},
				});
			}).rejects.toThrow();
		});
	});
}
