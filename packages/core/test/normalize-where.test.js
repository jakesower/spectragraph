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
