import { expect, it, describe } from "vitest";
import { careBearData } from "./fixtures/care-bear-data.js";
import { createQueryGraph } from "../src/query-graph.js";

const graph = createQueryGraph(careBearData);

describe("queryTree", () => {
	describe("without expressions", () => {
		it("fetches a single resource with array notation", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: ["name"],
			});

			expect(result).toEqual({ name: "Tenderheart Bear" });
		});

		it("fetches a single resource with object notation", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: { name: "name" },
			});

			expect(result).toEqual({ name: "Tenderheart Bear" });
		});

		it("fetches a single resource with mixed notation", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: ["name", { yearIntroduced: "yearIntroduced" }],
			});

			expect(result).toEqual({
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
			});
		});

		it("fetches a single resource with its id", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: ["id", "name"],
			});

			expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
		});

		it("fetches a single resource without its id", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: ["name"],
			});

			expect(result).toEqual({ name: "Tenderheart Bear" });
		});

		it("fetches a single resource and maps property names", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: {
					nombre: "name",
				},
			});

			expect(result).toEqual({ nombre: "Tenderheart Bear" });
		});

		it("fetches a property from multiple resources", async () => {
			const result = graph.query({
				type: "bears",
				select: { name: "name" },
			});

			const expected = [
				"Tenderheart Bear",
				"Cheer Bear",
				"Wish Bear",
				"Smart Heart Bear",
			].map((name) => ({ name }));

			expect(result).toEqual(expected);
		});

		it("fetches null for a nonexistent resource", async () => {
			const result = graph.query({
				type: "bears",
				id: "6",
				select: ["id"],
			});

			expect(result).toEqual(null);
		});

		it("fetches a single resource with a many-to-one relationship", async () => {
			const q = {
				type: "bears",
				id: "1",
				select: ["home"],
			} as const;

			const result = graph.query(q);

			expect(result).toEqual({
				home: { type: "homes", id: "1" },
			});
		});

		it("a single resource with a one-to-many relationship", async () => {
			const q = {
				type: "homes",
				id: "1",
				select: ["residents"],
			} as const;

			const result = await graph.query(q);

			expect(result).toEqual({
				residents: [
					{ type: "bears", id: "1" },
					{ type: "bears", id: "2" },
					{ type: "bears", id: "3" },
				],
			});
		});

		it("fetches a single resource with a subset of props", async () => {
			const result = graph.query({
				type: "bears",
				id: "1",
				select: ["id", "name", "furColor"],
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				furColor: "tan",
			});
		});

		it("fetches a single resource with a subset of props on a relationship", async () => {
			const q = {
				type: "bears",
				id: "1",
				select: { home: { select: { caringMeter: "caringMeter" } } },
			} as const;

			const result = await graph.query(q);

			expect(result).toEqual({ home: { caringMeter: 1 } });
		});

		it("uses explicitly set id fields", async () => {
			const result = await graph.query({
				type: "powers",
				id: "careBearStare",
				select: {
					powerId: "powerId",
				},
			});

			expect(result).toEqual({ powerId: "careBearStare" });
		});

		it("fetches a single resource ref with many-to-many relationship", async () => {
			const result = await graph.query({
				type: "bears",
				id: "1",
				select: ["powers"],
			});

			expect(result).toEqual({
				powers: [{ type: "powers", id: "careBearStare" }],
			});
		});

		it("fetches a single resource with many-to-many relationship and a `type` property", async () => {
			const result = await graph.query({
				type: "bears",
				id: "1",
				select: { powers: { select: ["type"] } },
			});

			expect(result).toEqual({
				powers: [{ type: "group power" }],
			});
		});

		it("fetches multiple subqueries of various types", async () => {
			const result = await graph.query({
				type: "bears",
				id: "1",
				select: {
					home: {
						select: ["residents"],
					},
					powers: "powers",
				},
			});

			expect(result).toEqual({
				home: {
					residents: [
						{ type: "bears", id: "1" },
						{ type: "bears", id: "2" },
						{ type: "bears", id: "3" },
					],
				},
				powers: [{ type: "powers", id: "careBearStare" }],
			});
		});

		it("handles subqueries between the same type", async () => {
			const result = await graph.query({
				type: "bears",
				select: {
					id: "id",
					bestFriend: "bestFriend",
				},
			});

			expect(result).toEqual([
				{ id: "1", bestFriend: null },
				{ id: "2", bestFriend: { type: "bears", id: "3" } },
				{ id: "3", bestFriend: { type: "bears", id: "2" } },
				{ id: "5", bestFriend: null },
			]);
		});

		it("returns undefined values for missing top level props", async () => {
			const result = await graph.query({
				type: "bears",
				id: "1",
				select: ["koopa"],
			});

			expect(result).toEqual({ koopa: undefined });
		});

		describe("dot notation", () => {
			it("fetches nested fields with dot notation", async () => {
				const result = await graph.query({
					type: "bears",
					select: {
						name: "name",
						residence: "home.name",
					},
				});

				expect(result).toEqual([
					{ name: "Tenderheart Bear", residence: "Care-a-Lot" },
					{ name: "Cheer Bear", residence: "Care-a-Lot" },
					{ name: "Wish Bear", residence: "Care-a-Lot" },
					{ name: "Smart Heart Bear", residence: null },
				]);
			});

			it("fetches doubly nested fields with dot notation", async () => {
				const result = await graph.query({
					type: "bears",
					select: {
						name: "name",
						friendsResidence: "bestFriend.home.name",
					},
				});

				expect(result).toEqual([
					{ name: "Tenderheart Bear", friendsResidence: null },
					{ name: "Cheer Bear", friendsResidence: "Care-a-Lot" },
					{ name: "Wish Bear", friendsResidence: "Care-a-Lot" },
					{ name: "Smart Heart Bear", friendsResidence: null },
				]);
			});
		});
	});

	describe("with expressions", () => {
		it("projects a field to a literal expression", async () => {
			const result = graph.query({
				type: "bears",
				select: {
					beep: { $literal: "boop" },
				},
			});

			expect(result).toEqual([
				{ beep: "boop" },
				{ beep: "boop" },
				{ beep: "boop" },
				{ beep: "boop" },
			]);
		});

		it("projects a field to an expression", async () => {
			const result = graph.query({
				type: "homes",
				select: {
					name: "name",
					numberOfResidents: { $count: "residents" },
				},
			});

			expect(result).toEqual([
				{ name: "Care-a-Lot", numberOfResidents: 3 },
				{ name: "Forest of Feelings", numberOfResidents: 0 },
				{ name: "Earth", numberOfResidents: 0 },
			]);
		});

		it("applies expressions over a nested resource", async () => {
			const result = graph.query({
				type: "bears",
				select: {
					name: "name",
					powerCount: { $count: { $get: "powers" } },
				},
			});

			expect(result).toEqual([
				{ name: "Tenderheart Bear", powerCount: 1 },
				{ name: "Cheer Bear", powerCount: 1 },
				{ name: "Wish Bear", powerCount: 1 },
				{ name: "Smart Heart Bear", powerCount: 1 },
			]);
		});

		it("evaluates the minimum across one-to-many nested resources", async () => {
			const result = graph.query({
				type: "homes",
				select: {
					name: "name",
					minYear: { $min: "residents.$.yearIntroduced" },
				},
			});

			expect(result).toEqual([
				{ name: "Care-a-Lot", minYear: 1982 },
				{ name: "Forest of Feelings", minYear: undefined },
				{ name: "Earth", minYear: undefined },
			]);
		});

		it("evaluates the minimum across many-to-many nested resources", async () => {
			const result = graph.query({
				type: "powers",
				select: {
					name: "name",
					minYear: { $min: "wielders.$.yearIntroduced" },
				},
			});

			expect(result).toEqual([
				{ name: "Care Bear Stare", minYear: 1982 },
				{ name: "Make a Wish", minYear: undefined },
			]);
		});

		it("evaluates deeply nested values", async () => {
			const result = graph.query({
				type: "powers",
				select: {
					name: "name",
					caring: { $sum: "wielders.$.home.caringMeter" },
				},
			});

			expect(result).toEqual([
				{ name: "Care Bear Stare", caring: 3 },
				{ name: "Make a Wish", caring: 0 },
			]);
		});
	});

	describe("where clauses", () => {
		it("filters on a property equality constraint", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id", "name"],
				where: { name: "Cheer Bear" },
			});

			expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
		});

		it("filters on a property that is not returned from properties", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: { name: { $eq: "Cheer Bear" } },
			});

			expect(result).toEqual([{ id: "2" }]);
		});

		it("filters on multiple property equality where", async () => {
			const result = await graph.query({
				type: "homes",
				select: ["id"],
				where: {
					caringMeter: 1,
					isInClouds: false,
				},
			});

			expect(result).toEqual([{ id: "2" }]);
		});

		it("filters using $eq operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $eq: 2005 },
				},
			});

			expect(result).toEqual([{ id: "5" }]);
		});

		it("filters using $gt operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $gt: 2000 },
				},
			});

			expect(result).toEqual([{ id: "5" }]);
		});

		it("filters using $lt operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $lt: 2000 },
				},
			});

			expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
		});

		it("filters using $lte operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $lte: 2000 },
				},
			});

			expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
		});

		it("filters using $gte operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $gte: 2005 },
				},
			});

			expect(result).toEqual([{ id: "5" }]);
		});

		it("filters using $in 1", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $in: [2005, 2022] },
				},
			});

			expect(result).toEqual([{ id: "5" }]);
		});

		it("filters using $in 2", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $in: [2022] },
				},
			});

			expect(result).toEqual([]);
		});

		it("filters using $ne operator", async () => {
			const result = await graph.query({
				type: "bears",
				select: ["id"],
				where: {
					yearIntroduced: { $ne: 2005 },
				},
			});

			expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
		});

		it("filters related resources", async () => {
			const result = await graph.query({
				type: "powers",
				id: "careBearStare",
				select: {
					powerId: "powerId",
					wielders: {
						select: ["id"],
						where: {
							yearIntroduced: { $gt: 2000 },
						},
					},
				},
			});

			expect(result).toEqual({
				powerId: "careBearStare",
				wielders: [{ id: "5" }],
			});
		});
	});

	describe("order tests", async () => {
		it("sorts on a numeric field", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
				order: { yearIntroduced: "desc" },
			});

			expect(result).toEqual([
				{ name: "Smart Heart Bear", yearIntroduced: 2005 },
				{ name: "Tenderheart Bear", yearIntroduced: 1982 },
				{ name: "Cheer Bear", yearIntroduced: 1982 },
				{ name: "Wish Bear", yearIntroduced: 1982 },
			]);
		});

		it("sorts on a string field", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
				order: { name: "asc" },
			});

			expect(result).toEqual([
				{ name: "Cheer Bear", yearIntroduced: 1982 },
				{ name: "Smart Heart Bear", yearIntroduced: 2005 },
				{ name: "Tenderheart Bear", yearIntroduced: 1982 },
				{ name: "Wish Bear", yearIntroduced: 1982 },
			]);
		});

		it("sorts on a numerical and a string field", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
				order: [{ yearIntroduced: "desc" }, { name: "asc" }],
			});

			expect(result).toEqual([
				{ name: "Smart Heart Bear", yearIntroduced: 2005 },
				{ name: "Cheer Bear", yearIntroduced: 1982 },
				{ name: "Tenderheart Bear", yearIntroduced: 1982 },
				{ name: "Wish Bear", yearIntroduced: 1982 },
			]);
		});
	});

	describe("limit/offset", () => {
		it("fetches a single resource", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				limit: 1,
			});

			expect(result).toEqual([{ name: "Tenderheart Bear" }]);
		});

		it("limits after sorting", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				limit: 2,
			});

			expect(result).toEqual([{ name: "Cheer Bear" }, { name: "Smart Heart Bear" }]);
		});

		it("limits after sorting with 1", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				limit: 1,
			});

			expect(result).toEqual([{ name: "Cheer Bear" }]);
		});

		it("limits with an offset", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				limit: 2,
				offset: 1,
			});

			expect(result).toEqual([
				{ name: "Smart Heart Bear" },
				{ name: "Tenderheart Bear" },
			]);
		});

		it("allows for offset only", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				offset: 1,
			});

			expect(result).toEqual([
				{ name: "Smart Heart Bear" },
				{ name: "Tenderheart Bear" },
				{ name: "Wish Bear" },
			]);
		});

		it("allows for limit + offset to exceed size of data", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				limit: 6,
				offset: 2,
			});

			expect(result).toEqual([{ name: "Tenderheart Bear" }, { name: "Wish Bear" }]);
		});

		it("returns nothing when the offset has surpassed the data size", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				limit: 6,
				offset: 20,
			});

			expect(result).toEqual([]);
		});

		it("allows a zero offset", async () => {
			const result = await graph.query({
				type: "bears",
				select: { name: "name" },
				order: { name: "asc" },
				offset: 0,
			});

			expect(result).toEqual([
				{ name: "Cheer Bear" },
				{ name: "Smart Heart Bear" },
				{ name: "Tenderheart Bear" },
				{ name: "Wish Bear" },
			]);
		});

		it("errors for a bad limit", async () => {
			await expect(async () => {
				await graph.query({
					type: "bears",
					select: ["id"],
					limit: 0,
				});
			}).rejects.toThrowError();
		});

		it("errors for a bad offset", async () => {
			await expect(async () => {
				await graph.query({
					type: "bears",
					select: ["id"],
					limit: 3,
					offset: -1,
				});
			}).rejects.toThrowError();
		});
	});
});
