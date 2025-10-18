import { describe, expect, it } from "vitest";
import { normalizeWhereClause } from "../src/lib/where-expressions.js";

describe("normalizeWhereClause", () => {
	describe("base cases", () => {
		it("should normalize the base case with a number", () => {
			const normalized = normalizeWhereClause({ age: 2 });
			expect(normalized).toEqual({ $matchesAll: { age: 2 } });
		});

		it("should normalize the base case with a string", () => {
			const normalized = normalizeWhereClause({ favoriteToy: "dolls" });
			expect(normalized).toEqual({
				$matchesAll: { favoriteToy: "dolls" },
			});
		});

		it("should normalize the base case with a string and a number", () => {
			const normalized = normalizeWhereClause({ age: 3, favoriteToy: "dolls" });
			expect(normalized).toEqual({
				$matchesAll: { age: 3, favoriteToy: "dolls" },
			});
		});
	});

	describe("logical expressions", () => {
		it("handles logical $and expressions around different attributes", () => {
			const normalized = normalizeWhereClause({
				$and: [{ favoriteToy: "dolls" }, { age: { $lt: 4 } }],
			});

			expect(normalized).toEqual({
				$and: [
					{ $matchesAll: { favoriteToy: "dolls" } },
					{ $matchesAll: { age: { $lt: 4 } } },
				],
			});
		});

		it("handles logical $or expressions around different attributes", () => {
			const normalized = normalizeWhereClause({
				$or: [{ favoriteToy: "dolls" }, { age: { $lt: 4 } }],
			});

			expect(normalized).toEqual({
				$or: [
					{ $matchesAll: { favoriteToy: "dolls" } },
					{ $matchesAll: { age: { $lt: 4 } } },
				],
			});
		});

		it("handles logical expressions within the same attribute", () => {
			const normalized = normalizeWhereClause({
				age: { $or: [{ $eq: 3 }, { $gte: 5 }] },
			});

			expect(normalized).toEqual({
				$matchesAll: { age: { $or: [{ $eq: 3 }, { $gte: 5 }] } },
			});
		});

		it("handles $not", () => {
			const normalized = normalizeWhereClause({
				age: { $not: { $eq: 3 } },
			});

			expect(normalized).toEqual({
				$matchesAll: { age: { $not: { $eq: 3 } } },
			});
		});
	});

	describe("other expressions", () => {
		it("handles $literal in an attribute position", () => {
			const normalized = normalizeWhereClause({
				parent: { $literal: { name: "James", age: 38 } },
			});

			expect(normalized).toEqual({
				$matchesAll: { parent: { $literal: { name: "James", age: 38 } } },
			});
		});

		it("handles $debug in an attribute position", () => {
			const normalized = normalizeWhereClause({
				age: { $debug: { $lt: 3 } },
			});

			expect(normalized).toEqual({
				$matchesAll: { age: { $debug: { $lt: 3 } } },
			});
		});

		it("handles arrays as $in shorthand", () => {
			const normalized = normalizeWhereClause({
				furColor: ["tan", "pink", "yellow"],
			});

			expect(normalized).toEqual({
				$matchesAll: { furColor: { $in: ["tan", "pink", "yellow"] } },
			});
		});

		it("handles array equality with explicit $literal", () => {
			const normalized = normalizeWhereClause({
				badges: { $literal: ["rainbow", "heart"] },
			});

			expect(normalized).toEqual({
				$matchesAll: { badges: { $literal: ["rainbow", "heart"] } },
			});
		});
	});

	describe("invalid cases", () => {
		it("doesn't allow non-objects", () => {
			expect(() => normalizeWhereClause(3)).toThrow();
			expect(() => normalizeWhereClause(null)).toThrow();
			expect(() => normalizeWhereClause([{ age: { $gt: 3 } }])).toThrow();
		});
	});
});
