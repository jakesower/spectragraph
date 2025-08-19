import { describe, expect, it } from "vitest";
import {
	isEvaluable,
	defaultExpressionEngine,
	defaultExpressions,
} from "../src/index.js";

describe("isEvaluable function", () => {
	describe("simple expressions", () => {
		it("identifies evaluable expressions", () => {
			// Comparative expressions with static values
			expect(isEvaluable({ $eq: [5, 5] })).toBe(true);
			expect(isEvaluable({ $gt: [10, 5] })).toBe(true);
			expect(isEvaluable({ $in: [[1, 2, 3], 2] })).toBe(true);

			// Logical expressions with static values
			expect(isEvaluable({ $and: [true, false] })).toBe(true);
			expect(isEvaluable({ $or: [false, true] })).toBe(true);

			// Aggregative expressions
			expect(isEvaluable({ $sum: [1, 2, 3, 4] })).toBe(true);
			expect(isEvaluable({ $mean: [10, 20, 30] })).toBe(true);
			expect(isEvaluable({ $median: [1, 3, 2] })).toBe(true);

			// Generative expressions
			expect(isEvaluable({ $random: {} })).toBe(true);
			expect(isEvaluable({ $random: { min: 1, max: 10 } })).toBe(true);
			expect(isEvaluable({ $uuid: null })).toBe(true);

			// Temporal expressions
			expect(isEvaluable({ $nowUTC: null })).toBe(true);
			expect(isEvaluable({ $nowLocal: null })).toBe(true);
			expect(isEvaluable({ $timestamp: null })).toBe(true);

			// Core expressions that don't need input data
			expect(isEvaluable({ $apply: [1, 2, 3] })).toBe(true);
			expect(isEvaluable({ $literal: "hello" })).toBe(true);
		});

		it("identifies non-evaluable expressions", () => {
			// Data-dependent core expressions
			expect(isEvaluable({ $get: "name" })).toBe(false);
			expect(isEvaluable({ $echo: null })).toBe(false);
			expect(isEvaluable({ $isDefined: null })).toBe(false);
			expect(isEvaluable({ $ensurePath: "user.name" })).toBe(false);

			// Control flow expressions that require data flow
			expect(isEvaluable({ $compose: [{ $eq: [5, 5] }] })).toBe(false);
			expect(isEvaluable({ $pipe: [{ $gt: [10, 5] }] })).toBe(false);
		});
	});

	describe("complex nested expressions", () => {
		it("identifies evaluable nested expressions", () => {
			// Static conditional
			expect(
				isEvaluable({
					$if: {
						if: true,
						then: { $sum: [1, 2, 3] },
						else: "fallback",
					},
				}),
			).toBe(true);

			// Static case expression
			expect(
				isEvaluable({
					$case: {
						value: "test",
						cases: [{ when: "test", then: { $random: {} } }],
						default: "unknown",
					},
				}),
			).toBe(true);

			// Nested logical and comparative
			expect(
				isEvaluable({
					$and: [{ $eq: [5, 5] }, { $or: [true, false] }],
				}),
			).toBe(true);
		});

		it("identifies non-evaluable nested expressions", () => {
			// Conditional with data-dependent condition
			expect(
				isEvaluable({
					$if: {
						if: { $get: "isActive" },
						then: "yes",
						else: "no",
					},
				}),
			).toBe(false);

			// Conditional with data-dependent branch
			expect(
				isEvaluable({
					$if: {
						if: true,
						then: { $get: "name" },
						else: "fallback",
					},
				}),
			).toBe(false);

			// Case with data-dependent value
			expect(
				isEvaluable({
					$case: {
						value: { $get: "status" },
						cases: [{ when: "active", then: "User is active" }],
						default: "Unknown",
					},
				}),
			).toBe(false);

			// Nested expressions with data dependency
			expect(
				isEvaluable({
					$and: [{ $eq: [5, 5] }, { $get: "isEnabled" }],
				}),
			).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("handles non-expression values", () => {
			expect(isEvaluable("string")).toBe(true);
			expect(isEvaluable(42)).toBe(true);
			expect(isEvaluable(true)).toBe(true);
			expect(isEvaluable(null)).toBe(true);
			expect(isEvaluable(undefined)).toBe(true);
			expect(isEvaluable([])).toBe(true);
			expect(isEvaluable({})).toBe(true);
			expect(isEvaluable({ notAnExpression: "value" })).toBe(true);
		});

		it("handles arrays with mixed evaluability", () => {
			// Array with all evaluable expressions
			expect(
				isEvaluable([{ $sum: [1, 2] }, { $random: {} }, "static value"]),
			).toBe(true);

			// Array with non-evaluable expression
			expect(
				isEvaluable([{ $sum: [1, 2] }, { $get: "name" }, "static value"]),
			).toBe(false);
		});

		it("handles objects with mixed evaluability", () => {
			// Object with all evaluable expressions
			expect(
				isEvaluable({
					total: { $sum: [1, 2, 3] },
					id: { $uuid: null },
					timestamp: { $nowUTC: null },
				}),
			).toBe(true);

			// Object with non-evaluable expression
			expect(
				isEvaluable({
					total: { $sum: [1, 2, 3] },
					name: { $get: "userName" },
					timestamp: { $nowUTC: null },
				}),
			).toBe(false);
		});

		it("handles expressions with no evaluate function", () => {
			// $not doesn't have an evaluate function in logical.js
			expect(isEvaluable({ $not: { $eq: [5, 5] } })).toBe(false);
		});

		it("handles deeply nested structures", () => {
			expect(
				isEvaluable({
					level1: {
						level2: [
							{
								level3: {
									$if: {
										if: true,
										then: { $sum: [1, 2, 3] },
										else: { $random: {} },
									},
								},
							},
						],
					},
				}),
			).toBe(true);

			expect(
				isEvaluable({
					level1: {
						level2: [
							{
								level3: {
									$if: {
										if: true,
										then: { $get: "value" },
										else: { $random: {} },
									},
								},
							},
						],
					},
				}),
			).toBe(false);
		});
	});

	describe("consistency with actual evaluation", () => {
		it("expressions marked as evaluable should actually evaluate", () => {
			const evaluableExpressions = [
				{ $sum: [1, 2, 3] },
				{ $random: { min: 0, max: 1 } },
				{ $uuid: null },
				{ $nowUTC: null },
				{ $eq: [5, 5] },
				{ $and: [true, false] },
				{
					$if: {
						if: true,
						then: { $sum: [10, 20] },
						else: "fallback",
					},
				},
			];

			evaluableExpressions.forEach((expr) => {
				expect(isEvaluable(expr)).toBe(true);
				expect(() => defaultExpressionEngine.evaluate(expr)).not.toThrow();
			});
		});

		it("expressions marked as non-evaluable should throw when evaluated", () => {
			const nonEvaluableExpressions = [
				{ $get: "name" },
				{ $echo: null },
				{ $compose: [{ $sum: [1, 2] }] },
				{
					$if: {
						if: { $get: "isActive" },
						then: "yes",
						else: "no",
					},
				},
			];

			nonEvaluableExpressions.forEach((expr) => {
				expect(isEvaluable(expr)).toBe(false);
				expect(() => defaultExpressionEngine.evaluate(expr)).toThrow();
			});
		});
	});

	describe("$literal", () => {
		it("allows literals that look like they wouldn't be evaluable", () => {
			expect(isEvaluable({ $literal: { $get: "I'm literal!" } })).toBe(true);
		});
	});

	describe("custom operations parameter", () => {
		it("works with custom operations object", () => {
			// Override existing operation with one that has no evaluate function
			const customOps = {
				...defaultExpressions,
				$sum: {
					apply: (operand) => operand.reduce((a, b) => a + b, 0),
					// No evaluate function - removed from original
				},
			};

			// $sum should now be non-evaluable with custom ops
			expect(isEvaluable({ $sum: [1, 2, 3] })).toBe(true); // default ops
			// custom ops without evaluate
			expect(isEvaluable({ $sum: [1, 2, 3] }, customOps)).toBe(false);
		});

		it("handles operations not in custom operations object", () => {
			const limitedOps = {
				$literal: {
					apply: (operand) => operand,
					evaluate: (operand) => operand,
				},
			};

			expect(isEvaluable({ $literal: "hello" }, limitedOps)).toBe(true);
			// Not in limitedOps
			expect(isEvaluable({ $sum: [1, 2, 3] }, limitedOps)).toBe(false);
		});
	});
});
