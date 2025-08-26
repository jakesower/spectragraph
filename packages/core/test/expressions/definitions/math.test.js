import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/expressions/expressions.js";

const { apply, evaluate } = defaultExpressionEngine;

describe("$add", () => {
	describe("apply form", () => {
		it("adds operand to input data", () => {
			expect(apply({ $add: 3 }, 5)).toEqual(8);
		});

		it("handles negative numbers", () => {
			expect(apply({ $add: -2 }, 10)).toEqual(8);
		});

		it("handles zero", () => {
			expect(apply({ $add: 0 }, 5)).toEqual(5);
		});

		it("throws with non-number operand", () => {
			expect(() => apply({ $add: "invalid" }, 5)).toThrowError(
				"$add apply form requires number operand",
			);
		});

		it("throws with non-number input data", () => {
			expect(() => apply({ $add: 3 }, "invalid")).toThrowError(
				"$add apply form requires number input data",
			);
		});
	});

	describe("evaluate form", () => {
		it("evaluates addition of two numbers", () => {
			expect(evaluate({ $add: [2, 3] })).toEqual(5);
		});

		it("handles negative numbers", () => {
			expect(evaluate({ $add: [-1, -2] })).toEqual(-3);
		});

		it("throws with wrong array length", () => {
			expect(() => evaluate({ $add: [1, 2, 3] })).toThrowError(
				"$add evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-array operand", () => {
			expect(() => evaluate({ $add: "invalid" })).toThrowError(
				"$add evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-number elements", () => {
			expect(() => evaluate({ $add: [1, "invalid"] })).toThrowError(
				"$add evaluate form requires array of exactly 2 numbers",
			);
		});
	});
});

describe("$subtract", () => {
	describe("apply form", () => {
		it("subtracts operand from input data", () => {
			expect(apply({ $subtract: 3 }, 10)).toEqual(7);
		});

		it("handles negative operand", () => {
			expect(apply({ $subtract: -2 }, 5)).toEqual(7);
		});

		it("handles zero operand", () => {
			expect(apply({ $subtract: 0 }, 5)).toEqual(5);
		});

		it("throws with non-number operand", () => {
			expect(() => apply({ $subtract: "invalid" }, 5)).toThrowError(
				"$subtract apply form requires number operand",
			);
		});

		it("throws with non-number input data", () => {
			expect(() => apply({ $subtract: 3 }, "invalid")).toThrowError(
				"$subtract apply form requires number input data",
			);
		});
	});

	describe("evaluate form", () => {
		it("evaluates subtraction of two numbers", () => {
			expect(evaluate({ $subtract: [10, 3] })).toEqual(7);
		});

		it("handles negative numbers", () => {
			expect(evaluate({ $subtract: [-5, -2] })).toEqual(-3);
		});

		it("throws with wrong array length", () => {
			expect(() => evaluate({ $subtract: [1, 2, 3] })).toThrowError(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-array operand", () => {
			expect(() => evaluate({ $subtract: "invalid" })).toThrowError(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-number elements", () => {
			expect(() => evaluate({ $subtract: [1, "invalid"] })).toThrowError(
				"$subtract evaluate form requires array of exactly 2 numbers",
			);
		});
	});
});

describe("$multiply", () => {
	describe("apply form", () => {
		it("multiplies input data by operand", () => {
			expect(apply({ $multiply: 3 }, 5)).toEqual(15);
		});

		it("handles negative operand", () => {
			expect(apply({ $multiply: -2 }, 5)).toEqual(-10);
		});

		it("handles zero operand", () => {
			expect(apply({ $multiply: 0 }, 5)).toEqual(0);
		});

		it("handles fractions", () => {
			expect(apply({ $multiply: 0.5 }, 4)).toEqual(2);
		});

		it("throws with non-number operand", () => {
			expect(() => apply({ $multiply: "invalid" }, 5)).toThrowError(
				"$multiply apply form requires number operand",
			);
		});

		it("throws with non-number input data", () => {
			expect(() => apply({ $multiply: 3 }, "invalid")).toThrowError(
				"$multiply apply form requires number input data",
			);
		});
	});

	describe("evaluate form", () => {
		it("evaluates multiplication of two numbers", () => {
			expect(evaluate({ $multiply: [6, 7] })).toEqual(42);
		});

		it("handles negative numbers", () => {
			expect(evaluate({ $multiply: [-2, 3] })).toEqual(-6);
		});

		it("handles zero", () => {
			expect(evaluate({ $multiply: [5, 0] })).toEqual(0);
		});

		it("throws with wrong array length", () => {
			expect(() => evaluate({ $multiply: [1, 2, 3] })).toThrowError(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-array operand", () => {
			expect(() => evaluate({ $multiply: "invalid" })).toThrowError(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-number elements", () => {
			expect(() => evaluate({ $multiply: [1, "invalid"] })).toThrowError(
				"$multiply evaluate form requires array of exactly 2 numbers",
			);
		});
	});
});

describe("$divide", () => {
	describe("apply form", () => {
		it("divides input data by operand", () => {
			expect(apply({ $divide: 3 }, 15)).toEqual(5);
		});

		it("handles negative operand", () => {
			expect(apply({ $divide: -2 }, 10)).toEqual(-5);
		});

		it("handles fractions", () => {
			expect(apply({ $divide: 0.5 }, 1)).toEqual(2);
		});

		it("throws on division by zero", () => {
			expect(() => apply({ $divide: 0 }, 10)).toThrowError(
				"Division by zero",
			);
		});

		it("throws with non-number operand", () => {
			expect(() => apply({ $divide: "invalid" }, 5)).toThrowError(
				"$divide apply form requires number operand",
			);
		});

		it("throws with non-number input data", () => {
			expect(() => apply({ $divide: 3 }, "invalid")).toThrowError(
				"$divide apply form requires number input data",
			);
		});
	});

	describe("evaluate form", () => {
		it("evaluates division of two numbers", () => {
			expect(evaluate({ $divide: [15, 3] })).toEqual(5);
		});

		it("handles negative numbers", () => {
			expect(evaluate({ $divide: [-10, 2] })).toEqual(-5);
		});

		it("handles fractions", () => {
			expect(evaluate({ $divide: [1, 0.5] })).toEqual(2);
		});

		it("throws on division by zero", () => {
			expect(() => evaluate({ $divide: [10, 0] })).toThrowError(
				"Division by zero",
			);
		});

		it("throws with wrong array length", () => {
			expect(() => evaluate({ $divide: [1, 2, 3] })).toThrowError(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-array operand", () => {
			expect(() => evaluate({ $divide: "invalid" })).toThrowError(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-number elements", () => {
			expect(() => evaluate({ $divide: [1, "invalid"] })).toThrowError(
				"$divide evaluate form requires array of exactly 2 numbers",
			);
		});
	});
});

describe("$modulo", () => {
	describe("apply form", () => {
		it("computes input data modulo operand", () => {
			expect(apply({ $modulo: 3 }, 10)).toEqual(1);
		});

		it("handles negative numbers", () => {
			expect(apply({ $modulo: 3 }, -10)).toEqual(-1);
			expect(apply({ $modulo: -3 }, 10)).toEqual(1);
		});

		it("handles zero dividend", () => {
			expect(apply({ $modulo: 5 }, 0)).toEqual(0);
		});

		it("throws on modulo by zero", () => {
			expect(() => apply({ $modulo: 0 }, 10)).toThrowError(
				"Modulo by zero",
			);
		});

		it("throws with non-number operand", () => {
			expect(() => apply({ $modulo: "invalid" }, 5)).toThrowError(
				"$modulo apply form requires number operand",
			);
		});

		it("throws with non-number input data", () => {
			expect(() => apply({ $modulo: 3 }, "invalid")).toThrowError(
				"$modulo apply form requires number input data",
			);
		});
	});

	describe("evaluate form", () => {
		it("evaluates modulo of two numbers", () => {
			expect(evaluate({ $modulo: [10, 3] })).toEqual(1);
		});

		it("handles negative numbers", () => {
			expect(evaluate({ $modulo: [-10, 3] })).toEqual(-1);
			expect(evaluate({ $modulo: [10, -3] })).toEqual(1);
		});

		it("handles zero dividend", () => {
			expect(evaluate({ $modulo: [0, 5] })).toEqual(0);
		});

		it("throws on modulo by zero", () => {
			expect(() => evaluate({ $modulo: [10, 0] })).toThrowError(
				"Modulo by zero",
			);
		});

		it("throws with wrong array length", () => {
			expect(() => evaluate({ $modulo: [1, 2, 3] })).toThrowError(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-array operand", () => {
			expect(() => evaluate({ $modulo: "invalid" })).toThrowError(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		});

		it("throws with non-number elements", () => {
			expect(() => evaluate({ $modulo: [1, "invalid"] })).toThrowError(
				"$modulo evaluate form requires array of exactly 2 numbers",
			);
		});
	});
});

describe("Math expressions integration", () => {
	it("can be combined with other expressions using evaluate form", () => {
		const result = evaluate({
			$add: [{ $multiply: [2, 3] }, { $subtract: [10, 4] }],
		});
		expect(result).toEqual(12); // (2*3) + (10-4) = 6 + 6 = 12
	});

	it("works with nested operations", () => {
		const result = evaluate({
			$divide: [{ $add: [10, 5] }, { $subtract: [8, 5] }],
		});
		expect(result).toEqual(5); // (10+5) / (8-5) = 15 / 3 = 5
	});

	it("uses modulo in calculations", () => {
		const result = evaluate({
			$modulo: [{ $add: [7, 8] }, 4],
		});
		expect(result).toEqual(3); // (7+8) % 4 = 15 % 4 = 3
	});

	it("apply form works with input data", () => {
		const result = apply({ $multiply: 3 }, 5);
		expect(result).toEqual(15); // 5 * 3 = 15
	});

	it("can chain apply operations", () => {
		// First multiply by 2, then add 1
		const step1 = apply({ $multiply: 2 }, 5); // 10
		const step2 = apply({ $add: 1 }, step1); // 11
		expect(step2).toEqual(11);
	});
});