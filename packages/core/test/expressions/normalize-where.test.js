import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const { normalizeWhereClause } = defaultExpressionEngine;

describe("normalizeWhereClause", () => {
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

	describe("conditional expressions", () => {
		it("should normalize $if expressions", () => {
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
					if: { $eq: true },
					then: "sleeping",
					else: "awake",
				},
			});
		});

		it("should normalize $case expressions", () => {
			const where = {
				activityLevel: {
					$case: {
						value: 4,
						cases: [
							{ when: 2, then: "toddler" },
							{ when: { $gt: 3 }, then: "preschooler" },
						],
						default: "baby",
					},
				},
			};
			const normalized = normalizeWhereClause(where);
			expect(normalized).toEqual({
				$case: {
					value: 4,
					cases: [
						{ when: 2, then: "toddler" },
						{ when: { $gt: 3 }, then: "preschooler" },
					],
					default: "baby",
				},
			});
		});
	});
});
