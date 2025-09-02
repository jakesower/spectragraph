import { describe, expect, it } from "vitest";
import { normalizeWhereClause } from "../src/lib/where-expressions.js";

describe("normalizeWhereClause", () => {
	describe("base cases", () => {
		it("should normalize the base case with a number", () => {
			const normalized = normalizeWhereClause({ age: 2 });
			expect(normalized).toEqual({ $pipe: [{ $get: "age" }, { $eq: 2 }] });
		});

		it("should normalize the base case with a string", () => {
			const normalized = normalizeWhereClause({ favoriteToy: "dolls" });
			expect(normalized).toEqual({
				$pipe: [{ $get: "favoriteToy" }, { $eq: "dolls" }],
			});
		});

		it("should normalize the base case with a string and a number", () => {
			const normalized = normalizeWhereClause({ age: 3, favoriteToy: "dolls" });
			expect(normalized).toEqual({
				$and: [
					{ $pipe: [{ $get: "age" }, { $eq: 3 }] },
					{ $pipe: [{ $get: "favoriteToy" }, { $eq: "dolls" }] },
				],
			});
		});
	});

	describe("comparative expressions", () => {
		["$eq", "$ne", "$lt", "$lte", "$gt", "$gte"].forEach((expr) => {
			it(`normalizes ${expr}`, () => {
				const normalized = normalizeWhereClause({
					age: { [expr]: 3 },
				});
				expect(normalized).toEqual({
					$pipe: [{ $get: "age" }, { [expr]: 3 }],
				});
			});
		});

		["$in", "$nin"].forEach((expr) => {
			it(`normalizes ${expr}`, () => {
				const normalized = normalizeWhereClause({
					age: { [expr]: [1, 2, 3] },
				});
				expect(normalized).toEqual({
					$pipe: [{ $get: "age" }, { [expr]: [1, 2, 3] }],
				});
			});
		});
	});

	describe("pattern matching expressions", () => {
		it("normalizes $matchesRegex", () => {
			const normalized = normalizeWhereClause({
				favoriteToy: { $matchesRegex: "dolls?" },
			});
			expect(normalized).toEqual({
				$pipe: [{ $get: "favoriteToy" }, { $matchesRegex: "dolls?" }],
			});
		});

		it("normalizes $matchesLike", () => {
			const normalized = normalizeWhereClause({
				favoriteToy: { $matchesLike: "d_lls" },
			});
			expect(normalized).toEqual({
				$pipe: [{ $get: "favoriteToy" }, { $matchesLike: "d_lls" }],
			});
		});

		it("normalizes $matchesGlob", () => {
			const normalized = normalizeWhereClause({
				favoriteToy: { $matchesGlob: "d?lls" },
			});
			expect(normalized).toEqual({
				$pipe: [{ $get: "favoriteToy" }, { $matchesGlob: "d?lls" }],
			});
		});
	});

	describe("conditional expressions", () => {
		it("should normalize $if expressions in attribute spot", () => {
			const where = {
				napStatus: {
					$if: {
						if: { $eq: true },
						then: "sleeping",
						else: "awake",
					},
				},
			};
			const normalized = normalizeWhereClause(where);
			expect(normalized).toEqual({
				$if: {
					if: { $pipe: [{ $get: "napStatus" }, { $eq: true }] },
					then: "sleeping",
					else: "awake",
				},
			});
		});

		it("should normalize $if expressions in root spot", () => {
			const where = {
				$if: {
					if: { napStatus: true },
					then: "sleeping",
					else: "awake",
				},
			};
			const normalized = normalizeWhereClause(where);
			expect(normalized).toEqual({
				$if: {
					if: { $pipe: [{ $get: "napStatus" }, { $eq: true }] },
					then: "sleeping",
					else: "awake",
				},
			});
		});

		it("should normalize $switch expressions", () => {
			const where = {
				activityLevel: {
					$switch: {
						cases: [
							{ when: 2, then: "toddler" },
							{ when: 3, then: "big kid" },
							{ when: 4, then: "preschooler" },
						],
						default: "baby",
					},
				},
			};
			const normalized = normalizeWhereClause(where);
			expect(normalized).toEqual({
				$switch: {
					value: { $get: "activityLevel" },
					cases: [
						{ when: 2, then: "toddler" },
						{ when: 3, then: "big kid" },
						{ when: 4, then: "preschooler" },
					],
					default: "baby",
				},
			});
		});

		it("should normalize $case expressions", () => {
			const where = {
				activityLevel: {
					$case: {
						cases: [
							{ when: { $eq: 2 }, then: "toddler" },
							{ when: { $gte: 3 }, then: "preschooler" },
						],
						default: "baby",
					},
				},
			};
			const normalized = normalizeWhereClause(where);
			expect(normalized).toEqual({
				$case: {
					value: { $get: "activityLevel" },
					cases: [
						{ when: { $eq: 2 }, then: "toddler" },
						{ when: { $gte: 3 }, then: "preschooler" },
					],
					default: "baby",
				},
			});
		});
	});

	describe("logical expressions", () => {
		it("handles logical $and expressions around the different attributes", () => {
			const normalized = normalizeWhereClause({
				$and: [{ favoriteToy: "dolls" }, { age: { $lt: 4 } }],
			});

			expect(normalized).toEqual({
				$and: [
					{ $pipe: [{ $get: "favoriteToy" }, { $eq: "dolls" }] },
					{ $pipe: [{ $get: "age" }, { $lt: 4 }] },
				],
			});
		});

		it("handles logical $or expressions around the different attributes", () => {
			const normalized = normalizeWhereClause({
				$or: [{ favoriteToy: "dolls" }, { age: { $lt: 4 } }],
			});

			expect(normalized).toEqual({
				$or: [
					{ $pipe: [{ $get: "favoriteToy" }, { $eq: "dolls" }] },
					{ $pipe: [{ $get: "age" }, { $lt: 4 }] },
				],
			});
		});

		it("handles logical expressions within the same attribute", () => {
			const normalized = normalizeWhereClause({
				age: { $or: [3, { $gte: 5 }] },
			});

			expect(normalized).toEqual({
				$or: [
					{ $pipe: [{ $get: "age" }, { $eq: 3 }] },
					{ $pipe: [{ $get: "age" }, { $gte: 5 }] },
				],
			});
		});

		it("handles $not", () => {
			const normalized = normalizeWhereClause({
				age: { $not: 3 },
			});

			expect(normalized).toEqual({
				$not: { $pipe: [{ $get: "age" }, { $eq: 3 }] },
			});
		});
	});

	describe("temporal expressions", () => {
		["$nowLocal", "$nowUTC", "$timestamp"].forEach((expr) => {
			it(`handles ${expr}`, () => {
				const normalized = normalizeWhereClause({
					birthTime: { $lt: { [expr]: null } },
				});
				expect(normalized).toEqual({
					$pipe: [{ $get: "birthTime" }, { $lt: { [expr]: null } }],
				});
			});
		});
	});

	describe("other expressions", () => {
		it("handles $literal in an attribute position", () => {
			const normalized = normalizeWhereClause({
				parent: { $literal: { name: "Priya", age: 33 } },
			});

			expect(normalized).toEqual({
				$pipe: [
					{ $get: "parent" },
					{ $eq: { $literal: { name: "Priya", age: 33 } } },
				],
			});
		});

		it("handles $debug in an attribute position", () => {
			const normalized = normalizeWhereClause({
				age: { $debug: { $lt: 3 } },
			});

			expect(normalized).toEqual({
				$debug: { $pipe: [{ $get: "age" }, { $lt: 3 }] },
			});
		});
	});
});
