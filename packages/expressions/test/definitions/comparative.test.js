import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const kids = {
	ximena: { name: "Ximena", age: 4 },
	yousef: { name: "Yousef", age: 5 },
	zoë: { name: "Zoë", age: 6 },
};

const { compile } = defaultExpressionEngine;

describe("the $eq expression", () => {
	it("is determined deeply", async () => {
		const compiled = compile({
			$eq: [3, { chicken: "butt" }],
		});
		expect(compiled([3, { chicken: "butt" }])).toBe(true);
	});
});

it("implements the $gt expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $gt: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $gte expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $gte: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $lt expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $lt: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(false);
});

it("implements the $lte expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $lte: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(false);
});

it("implements the $ne expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $ne: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $in expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $in: [4, 6] }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $nin expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $nin: [4, 6] }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(false);
});

describe("evaluate functions", () => {
	const { evaluate } = defaultExpressionEngine;

	// $eq is pure mathematical - no currying needed, same operand for apply and evaluate
	it("$eq evaluates static comparisons", () => {
		expect(evaluate({ $eq: [5, 5] })).toBe(true);
		expect(evaluate({ $eq: [5, 10] })).toBe(false);
		expect(evaluate({ $eq: [{ a: 1 }, { a: 1 }] })).toBe(true);
	});

	it("$ne evaluates static comparisons", () => {
		expect(evaluate({ $ne: [5, 10] })).toBe(true);
		expect(evaluate({ $ne: [5, 5] })).toBe(false);
	});

	it("$gt evaluates static comparisons", () => {
		expect(evaluate({ $gt: [10, 5] })).toBe(true);
		expect(evaluate({ $gt: [5, 10] })).toBe(false);
		expect(evaluate({ $gt: [5, 5] })).toBe(false);
	});

	it("$gte evaluates static comparisons", () => {
		expect(evaluate({ $gte: [10, 5] })).toBe(true);
		expect(evaluate({ $gte: [5, 5] })).toBe(true);
		expect(evaluate({ $gte: [5, 10] })).toBe(false);
	});

	it("$lt evaluates static comparisons", () => {
		expect(evaluate({ $lt: [5, 10] })).toBe(true);
		expect(evaluate({ $lt: [10, 5] })).toBe(false);
		expect(evaluate({ $lt: [5, 5] })).toBe(false);
	});

	it("$lte evaluates static comparisons", () => {
		expect(evaluate({ $lte: [5, 10] })).toBe(true);
		expect(evaluate({ $lte: [5, 5] })).toBe(true);
		expect(evaluate({ $lte: [10, 5] })).toBe(false);
	});

	it("$in evaluates static array membership", () => {
		expect(evaluate({ $in: [[1, 2, 3], 2] })).toBe(true);
		expect(evaluate({ $in: [[1, 2, 3], 5] })).toBe(false);
	});

	it("$in throws error for non-array parameter in evaluate", () => {
		expect(() => evaluate({ $in: ["not-array", 2] })).toThrow("$in parameter must be an array");
	});

	it("$nin evaluates static array membership", () => {
		expect(evaluate({ $nin: [[1, 2, 3], 5] })).toBe(true);
		expect(evaluate({ $nin: [[1, 2, 3], 2] })).toBe(false);
	});

	it("$nin throws error for non-array parameter in evaluate", () => {
		expect(() => evaluate({ $nin: ["not-array", 2] })).toThrow("$nin parameter must be an array");
	});
});
