import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const { apply, evaluate } = defaultExpressionEngine;

describe("$and", () => {
	it("returns true when all conditions are true", () => {
		const expression = {
			$and: [{ $gte: 4 }, { $lte: 6 }],
		};

		expect(apply(expression, 5)).toBe(true);
		expect(apply(expression, 4)).toBe(true);
		expect(apply(expression, 6)).toBe(true);
	});

	it("returns false when any condition is false", () => {
		const expression = {
			$and: [{ $gte: 4 }, { $lte: 6 }],
		};

		expect(apply(expression, 3)).toBe(false);
		expect(apply(expression, 7)).toBe(false);
	});

	it("evaluates static boolean arrays", () => {
		expect(evaluate({ $and: [true, true, true] })).toBe(true);
		expect(evaluate({ $and: [true, false, true] })).toBe(false);
		expect(evaluate({ $and: [false, false, false] })).toBe(false);
		expect(evaluate({ $and: [] })).toBe(true); // empty array
	});
});

describe("$or", () => {
	it("returns true when any condition is true", () => {
		const expression = {
			$or: [{ $eq: "Ximena" }, { $eq: "Zoë" }],
		};

		expect(apply(expression, "Ximena")).toBe(true);
		expect(apply(expression, "Zoë")).toBe(true);
		expect(apply(expression, "Yousef")).toBe(false);
	});

	it("returns false when all conditions are false", () => {
		const expression = {
			$or: [{ $lt: 3 }, { $gt: 7 }],
		};

		expect(apply(expression, 5)).toBe(false);
	});

	it("evaluates static boolean arrays", () => {
		expect(evaluate({ $or: [false, false, true] })).toBe(true);
		expect(evaluate({ $or: [true, false, false] })).toBe(true);
		expect(evaluate({ $or: [false, false, false] })).toBe(false);
		expect(evaluate({ $or: [] })).toBe(false); // empty array
	});
});

describe("$not", () => {
	it("inverts boolean results", () => {
		expect(apply({ $not: { $eq: 5 } }, 5)).toBe(false);
		expect(apply({ $not: { $eq: 5 } }, 10)).toBe(true);
	});

	it("works with complex expressions", () => {
		const expression = {
			$not: { $and: [{ $gte: 4 }, { $lte: 6 }] },
		};

		expect(apply(expression, 5)).toBe(false); // 5 is between 4-6, so NOT that is false
		expect(apply(expression, 2)).toBe(true); // 2 is not between 4-6, so NOT that is true
	});

	it("evaluate with boolean value", () => {
		expect(evaluate({ $not: true })).toBe(false);
		expect(evaluate({ $not: false })).toBe(true);
	});

	it("evaluate with expression", () => {
		expect(evaluate({ $not: { $eq: [5, 5] } })).toBe(false);
		expect(evaluate({ $not: { $eq: [5, 10] } })).toBe(true);
	});
});
