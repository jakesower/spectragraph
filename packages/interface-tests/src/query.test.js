import { expect, it, describe } from "vitest";
import { careBearData, careBearSchema } from "./fixtures/index.js";
import { normalizeQuery, ExpressionNotSupportedError } from "@data-prism/core";

/**
 * Helper function to test expressions that may not be supported by all stores.
 * If the store throws an ExpressionNotSupportedError, the test is skipped.
 * Otherwise, the test runs normally.
 */
async function testExpressionOrSkip(testFn) {
	try {
		await testFn();
	} catch (error) {
		if (error instanceof ExpressionNotSupportedError) {
			// Skip this test - the store doesn't support this expression
			console.log(`Skipping test: ${error.message}`);
			return;
		}
		// Re-throw any other errors
		throw error;
	}
}

export function runQueryTests(createStore) {
	describe("core query operations", () => {
		it("fetches appropriately on an empty store", async () => {
			const store = createStore(careBearSchema);
			const result = await store.query({
				type: "companions",
				id: "nonexistent",
				select: ["name"],
			});

			expect(result).toEqual(null);
		});

		it("fetches appropriately on an empty store with multiple resources", async () => {
			const store = createStore(careBearSchema);
			const result = await store.query({
				type: "villains",
				select: ["name"],
			});

			expect(result).toEqual([]);
		});

		it("fetches a single resource", async () => {
			const store = createStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = await store.query({
				type: "bears",
				id: "1",
				select: ["name"],
			});

			expect(result).toEqual({ name: "Tenderheart Bear" });
		});

		it("fetches a single resource with specific attributes", async () => {
			const store = createStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = await store.query({
				type: "bears",
				id: "1",
				select: ["id", "name", "yearIntroduced", "bellyBadge", "furColor"],
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			});
		});
	});

	describe.skip("select clauses", () => {
		describe("* notation", () => {
			it("fetches a single resource with * as a string", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: "*",
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});

			it("fetches a single resource with * in an array", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: ["name", "*"],
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});

			it("fetches a single resource with * in an object", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: { "*": true },
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});
		});

		describe("select expressions", () => {
			describe("$if", () => {
				it("selects the right stuff with an $if expression", () => {});
			});
		});
	});

	describe("where clauses", () => {
		describe("general", () => {
			it("filters on a property equality constraint", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id", "name"],
					where: { name: "Cheer Bear" },
				});

				expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
			});

			it("filters on an attribute that is not returned from selected attributes", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: { name: { $eq: "Cheer Bear" } },
				});

				expect(result).toEqual([{ id: "2" }]);
			});

			it("filters on multiple property equality where", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "homes",
					select: ["id"],
					where: {
						caringMeter: 1,
						isInClouds: false,
					},
				});

				expect(result).toEqual([{ id: "2" }]);
			});
		});

		describe("expressions", () => {
			it("filters using $eq operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $eq: 2005 },
					},
				});

				expect(result).toEqual([{ id: "5" }]);
			});

			it("filters using $gt operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $gt: 2000 },
					},
				});

				expect(result).toEqual([{ id: "5" }]);
			});

			it("filters using $lt operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $lt: 2000 },
					},
				});

				expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
			});

			it("filters using $lte operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $lte: 2000 },
					},
				});

				expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
			});

			it("filters using $gte operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $gte: 2005 },
					},
				});

				expect(result).toEqual([{ id: "5" }]);
			});

			it("filters using $in 1", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $in: [2005, 2022] },
					},
				});

				expect(result).toEqual([{ id: "5" }]);
			});

			it("filters using $in 2", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $in: [2022] },
					},
				});

				expect(result).toEqual([]);
			});

			it("filters using $ne operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: {
						yearIntroduced: { $ne: 2005 },
					},
				});

				expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
			});

			it("filters related resources", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "powers",
					id: "careBearStare",
					select: {
						powerId: "powerId",
						wielders: {
							select: ["id", "bellyBadge"],
							where: {
								bellyBadge: { $eq: "shooting star" },
							},
						},
					},
				});

				expect(result).toEqual({
					powerId: "careBearStare",
					wielders: [{ id: "3", bellyBadge: "shooting star" }],
				});
			});

			it("filters using an $or operation", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const result = await store.query({
						type: "bears",
						select: {
							id: "id",
						},
						where: {
							$or: [
								{ yearIntroduced: { $gt: 2000 } },
								{ bellyBadge: "rainbow" },
							],
						},
					});

					expect(result).toEqual([{ id: "2" }, { id: "5" }]);
				});
			});

			it("filters using an $or and $and operation", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const result = await store.query({
						type: "bears",
						select: {
							id: "id",
						},
						where: {
							$or: [
								{ yearIntroduced: { $gt: 2000 } },
								{
									$and: [
										{ name: "Tenderheart Bear" },
										{ bellyBadge: "rainbow" },
									],
								},
							],
						},
					});

					expect(result).toEqual([{ id: "5" }]);
				});
			});

			it("filters using an $or and $not operation", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const result = await store.query({
						type: "bears",
						select: {
							id: "id",
						},
						where: {
							$not: {
								$or: [
									{ yearIntroduced: { $gt: 2000 } },
									{ bellyBadge: "rainbow" },
								],
							},
						},
					});

					expect(result).toEqual([{ id: "1" }, { id: "3" }]);
				});
			});

			it("filters with an $if expression", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const query = normalizeQuery(careBearSchema, {
						type: "bears",
						select: ["name"],
						where: {
							$if: {
								if: { yearIntroduced: { $lt: 2000 } },
								then: { bellyBadge: "rainbow" },
								else: { furColor: "watermelon pink" },
							},
						},
					});
					const result = await store.query(query);

					expect(result).toEqual([
						{ name: "Cheer Bear" },
						{ name: "Smart Heart Bear" },
					]);
				});
			});

			it("filters with an $if expression with a literal", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const query = normalizeQuery(careBearSchema, {
						type: "bears",
						select: ["name"],
						where: {
							$if: {
								if: { $literal: true },
								then: { bellyBadge: "rainbow" },
								else: { furColor: "watermelon pink" },
							},
						},
					});
					const result = await store.query(query);

					expect(result).toEqual([{ name: "Cheer Bear" }]);
				});
			});

			it("filters using $matchesRegex operator", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const query = normalizeQuery(careBearSchema, {
						type: "bears",
						select: ["name"],
						where: {
							name: { $matchesRegex: ".*Heart.*$" },
						},
					});
					const result = await store.query(query);

					expect(result).toEqual([{ name: "Smart Heart Bear" }]);
				});
			});

			it("filters using $matchesRegex operator with the case insensitive", async () => {
				await testExpressionOrSkip(async () => {
					const store = createStore(careBearSchema, {
						initialData: careBearData,
					});

					const query = normalizeQuery(careBearSchema, {
						type: "bears",
						select: ["name"],
						where: {
							name: { $matchesRegex: "(?i).*Heart.*$" },
						},
					});
					const result = await store.query(query);

					expect(result).toEqual([
						{ name: "Tenderheart Bear" },
						{ name: "Smart Heart Bear" },
					]);
				});
			});

			it("filters using $matchesRegex operator with start anchor", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: "^Cheer.*" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Cheer Bear" }]);
			});

			it("filters using $matchesRegex operator with end anchor", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: ".*Bear$" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([
					{ name: "Tenderheart Bear" },
					{ name: "Cheer Bear" },
					{ name: "Wish Bear" },
					{ name: "Smart Heart Bear" },
				]);
			});

			it("filters using $matchesRegex operator with character class", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: "[CW][a-z]+ Bear" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Cheer Bear" }, { name: "Wish Bear" }]);
			});

			it("filters using $matchesRegex operator with quantifiers", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: "^.{4,10} Bear$" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Cheer Bear" }, { name: "Wish Bear" }]);
			});

			it("filters using $matchesRegex operator with alternation", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: "(Tender|Smart).*Bear" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([
					{ name: "Tenderheart Bear" },
					{ name: "Smart Heart Bear" },
				]);
			});

			it("filters using $matchesRegex operator with combined flags", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "bears",
					select: ["name"],
					where: {
						name: { $matchesRegex: "(?ims)^tender.*bear$" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Tenderheart Bear" }]);
			});

			it("filters using $matchesRegex operator with multiline flag", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "companions",
					select: ["name"],
					where: {
						description: { $matchesRegex: "(?m)^Always" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([
					{ name: "Brave Heart Lion" },
					{ name: "Loyal Heart Dog" },
				]);
			});

			it("filters using $matchesRegex operator without multiline flag", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "companions",
					select: ["name"],
					where: {
						description: { $matchesRegex: "^Always" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([]);
			});

			it("filters using $matchesRegex operator with dotall flag", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "companions",
					select: ["name"],
					where: {
						description: { $matchesRegex: "(?s)friend.*everyone" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Cozy Heart Penguin" }]);
			});

			it("filters using $matchesRegex operator without dotall flag", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "companions",
					select: ["name"],
					where: {
						description: { $matchesRegex: "friend.*everyone" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([]);
			});

			it("filters using $matchesRegex operator with multiline anchors", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const query = normalizeQuery(careBearSchema, {
					type: "companions",
					select: ["name"],
					where: {
						description: { $matchesRegex: "(?m)^start:.*loyal$" },
					},
				});
				const result = await store.query(query);

				expect(result).toEqual([{ name: "Loyal Heart Dog" }]);
			});
		});
	});
}
