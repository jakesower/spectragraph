import { describe, expect, it } from "vitest";
import { createExpressionEngine, defaultExpressions } from "../../src/index.js";

// Sample daycare data
const children = [
	{ name: "Zahra", age: 2, napDuration: 120, favoriteToy: "blocks" },
	{ name: "Astrid", age: 3, napDuration: 90, favoriteToy: "cars" },
	{ name: "Ximena", age: 4, napDuration: 60, favoriteToy: "dolls" },
	{ name: "Nomsa", age: 5, napDuration: 0, favoriteToy: "puzzles" },
];

// Create custom expression engine with daycare-themed expressions
const customEngine = createExpressionEngine({
	...defaultExpressions,

	// Simple case: Convert age from years to months
	$ageInMonths: {
		apply: (_, inputData) => {
			if (typeof inputData !== "number" || inputData < 0) {
				throw new Error("Age must be a non-negative number");
			}
			return inputData * 12;
		},
		evaluate: (operand) => {
			return operand * 12;
		},
	},

	// controlsEvaluation case: Find children in age range
	$findByAge: {
		apply: (operand, inputData, { apply }) =>
			inputData.find((child) => apply(operand, child.age)),
		controlsEvaluation: true,
		evaluate: ([predicate, childrenArray], { apply }) => {
			return apply({ $findByAge: predicate }, childrenArray);
		},
	},

	// Delegation case: Calculate nap time score using built-in expressions
	$napTimeScore: {
		apply: (_, inputData, { apply }) => {
			// Get nap duration, default to 0 if not present
			const napMinutes = apply({ $get: "napDuration" }, inputData) || 0;

			// Age multiplier: younger children get higher scores for longer naps
			const ageMultiplier = apply(
				{
					$if: {
						if: { $lt: 3 },
						then: 2.0,
						else: 1.5,
					},
				},
				inputData.age,
			);

			// Bonus points for any nap time
			const baseBonus = apply(
				{
					$if: {
						if: { $gt: 0 },
						then: 10,
						else: 0,
					},
				},
				napMinutes,
			);

			return napMinutes * ageMultiplier + baseBonus;
		},
		controlsEvaluation: true,
		evaluate: (child, { apply }) => {
			return apply({ $napTimeScore: null }, child);
		},
	},
});

describe("Custom Expressions", () => {
	describe("$ageInMonths (simple case)", () => {
		it("converts age from years to months", () => {
			expect(customEngine.apply({ $ageInMonths: null }, 3)).toBe(36);
			expect(customEngine.apply({ $ageInMonths: null }, 2.5)).toBe(30);
			expect(customEngine.apply({ $ageInMonths: null }, 0)).toBe(0);
		});

		it("works with evaluate form", () => {
			expect(customEngine.evaluate({ $ageInMonths: 4 })).toBe(48);
			expect(customEngine.evaluate({ $ageInMonths: 1.5 })).toBe(18);
		});

		it("throws error for invalid ages", () => {
			expect(() => customEngine.apply({ $ageInMonths: null }, -1)).toThrowError(
				"Age must be a non-negative number",
			);
			expect(() =>
				customEngine.apply({ $ageInMonths: null }, "three"),
			).toThrowError("Age must be a non-negative number");
		});
	});

	describe("$findByAge (controlsEvaluation case)", () => {
		it("finds children matching age predicate", () => {
			const result = customEngine.apply({ $findByAge: { $eq: 3 } }, children);
			expect(result).toEqual({
				name: "Astrid",
				age: 3,
				napDuration: 90,
				favoriteToy: "cars",
			});

			const older = customEngine.apply({ $findByAge: { $gte: 4 } }, children);
			expect(older).toEqual({
				name: "Ximena",
				age: 4,
				napDuration: 60,
				favoriteToy: "dolls",
			});
		});

		it("returns undefined when no match found", () => {
			const result = customEngine.apply({ $findByAge: { $eq: 10 } }, children);
			expect(result).toBeUndefined();
		});

		it("works with evaluate form", () => {
			const result = customEngine.evaluate({
				$findByAge: [{ $eq: 2 }, children],
			});
			expect(result).toEqual({
				name: "Zahra",
				age: 2,
				napDuration: 120,
				favoriteToy: "blocks",
			});
		});

		it("works with complex predicates", () => {
			const result = customEngine.apply(
				{
					$findByAge: {
						$and: [{ $gte: 3 }, { $lte: 4 }],
					},
				},
				children,
			);
			expect(result.name).toBe("Astrid"); // First match
		});
	});

	describe("$napTimeScore (delegation case)", () => {
		it("calculates nap time score using built-in expressions", () => {
			// Zahra: age 2 (< 3), napDuration 120 -> (120 * 2.0) + 10 = 250
			const zahraScore = customEngine.apply(
				{ $napTimeScore: null },
				children[0],
			);
			expect(zahraScore).toBe(250);

			// Astrid: age 3 (>= 3), napDuration 90 -> (90 * 1.5) + 10 = 145
			const astridScore = customEngine.apply(
				{ $napTimeScore: null },
				children[1],
			);
			expect(astridScore).toBe(145);

			// Nomsa: age 5, napDuration 0 -> (0 * 1.5) + 0 = 0
			const nomsaScore = customEngine.apply(
				{ $napTimeScore: null },
				children[3],
			);
			expect(nomsaScore).toBe(0);
		});

		it("works with evaluate form", () => {
			const ximenaScore = customEngine.evaluate({
				$napTimeScore: {
					name: "Ximena",
					age: 4,
					napDuration: 60,
					favoriteToy: "dolls",
				},
			});
			// Ximena: age 4 (>= 3), napDuration 60 -> (60 * 1.5) + 10 = 100
			expect(ximenaScore).toBe(100);
		});

		it("handles missing napDuration gracefully", () => {
			const childWithoutNap = { name: "Kenji", age: 3 };
			const score = customEngine.apply(
				{ $napTimeScore: null },
				childWithoutNap,
			);
			// No nap duration -> (0 * 1.5) + 0 = 0
			expect(score).toBe(0);
		});

		it("demonstrates delegation to multiple built-in expressions", () => {
			// This test verifies that $get, $if, $lt, $gt all work within our custom expression
			const testChild = { name: "Olumide", age: 2, napDuration: 100 };
			const score = customEngine.apply({ $napTimeScore: null }, testChild);

			// Verify the calculation uses the built-in expressions correctly
			// Age 2 (< 3) -> multiplier 2.0
			// napDuration 100 (> 0) -> gets bonus 10
			// Score: (100 * 2.0) + 10 = 210
			expect(score).toBe(210);
		});
	});

	describe("Integration with existing expressions", () => {
		it("can be used within built-in expressions", () => {
			// Use custom expression within $map
			const agesInMonths = customEngine.apply(
				{
					$map: { $ageInMonths: null },
				},
				children.map((c) => c.age),
			);
			expect(agesInMonths).toEqual([24, 36, 48, 60]);

			// Use custom expression within $if
			const description = customEngine.apply(
				{
					$if: {
						if: { $gte: 36 }, // 3 years in months
						then: "Preschooler",
						else: "Toddler",
					},
				},
				customEngine.apply({ $ageInMonths: null }, 2.5),
			);
			expect(description).toBe("Toddler");
		});

		it("can be combined with filtering", () => {
			// Find all children with high nap scores
			const highScorers = customEngine.apply(
				{
					$filter: { $gte: 100 },
				},
				children.map((child) =>
					customEngine.apply({ $napTimeScore: null }, child),
				),
			);

			expect(highScorers).toEqual([250, 145, 100]); // Zahra, Astrid, Ximena
		});
	});
});
