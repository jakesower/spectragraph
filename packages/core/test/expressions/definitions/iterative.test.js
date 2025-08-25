import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/expressions/expressions.js";

const kids = [
	{ name: "Ximena", age: 4 },
	{ name: "Yousef", age: 5 },
	{ name: "Zoë", age: 6 },
];

const { apply, evaluate } = defaultExpressionEngine;

describe("apply", () => {
	describe("$map", () => {
		it("should perform without subexpressions", () => {
			expect(apply({ $map: { $echo: {} } }, [3])).toEqual([3]);
		});

		it("should perform with a subexpression", () => {
			expect(apply({ $map: { $get: "age" } }, kids)).toEqual([4, 5, 6]);
		});
	});

	it("$filter", () => {
		expect(apply({ $filter: { $eq: 2 } }, [1, 2, 3])).toEqual([2]);
	});

	it("$any", () => {
		expect(apply({ $any: { $gt: 5 } }, [4, 5, 6])).toBe(true);
		expect(apply({ $any: { $gt: 10 } }, [4, 5, 6])).toBe(false);
	});

	it("$all", () => {
		expect(apply({ $all: { $gt: 3 } }, [4, 5, 6])).toBe(true);
		expect(apply({ $all: { $gt: 5 } }, [4, 5, 6])).toBe(false);
	});

	it("$find", () => {
		expect(apply({ $find: { $eq: 5 } }, [4, 5, 6])).toBe(5);
		expect(apply({ $find: { $gt: 10 } }, [4, 5, 6])).toBe(undefined);
	});

	it("$concat", () => {
		expect(apply({ $concat: [4, 5] }, [1, 2, 3])).toEqual([1, 2, 3, 4, 5]);
	});

	it("$join", () => {
		expect(apply({ $join: ", " }, [1, 2, 3])).toBe("1, 2, 3");
		expect(apply({ $join: "" }, ["a", "b", "c"])).toBe("abc");
	});

	it("$reverse", () => {
		expect(apply({ $reverse: {} }, [1, 2, 3])).toEqual([3, 2, 1]);
	});
});

describe("evaluate", () => {
	it("$map", () => {
		expect(evaluate({ $map: [{ $get: "age" }, kids] })).toEqual([4, 5, 6]);
	});

	it("$filter", () => {
		expect(evaluate({ $filter: [{ $eq: 2 }, [1, 2, 3]] })).toEqual([2]);
	});

	it("$flatMap", () => {
		expect(evaluate({ $flatMap: [{ $literal: [1, 2] }, [[1], [2]]] })).toEqual([
			1, 2, 1, 2,
		]);
	});

	it("$any", () => {
		expect(evaluate({ $any: [{ $gt: 5 }, [4, 5, 6]] })).toBe(true);
		expect(evaluate({ $any: [{ $gt: 10 }, [4, 5, 6]] })).toBe(false);
		expect(evaluate({ $any: [{ $eq: "Zoë" }, kids.map(k => k.name)] })).toBe(true);
	});

	it("$all", () => {
		expect(evaluate({ $all: [{ $gt: 3 }, [4, 5, 6]] })).toBe(true);
		expect(evaluate({ $all: [{ $gt: 5 }, [4, 5, 6]] })).toBe(false);
		expect(evaluate({ $all: [{ $gt: 0 }, kids.map(k => k.age)] })).toBe(true);
	});

	it("$find", () => {
		expect(evaluate({ $find: [{ $eq: 5 }, [4, 5, 6]] })).toBe(5);
		expect(evaluate({ $find: [{ $gt: 10 }, [4, 5, 6]] })).toBe(undefined);
		expect(evaluate({ $find: [{ $eq: "Zoë" }, kids.map(k => k.name)] })).toBe("Zoë");
	});

	it("$concat", () => {
		expect(evaluate({ $concat: [[4, 5], [1, 2, 3]] })).toEqual([1, 2, 3, 4, 5]);
		expect(evaluate({ $concat: [[], [1, 2]] })).toEqual([1, 2]);
		expect(evaluate({ $concat: [["a"], ["b", "c"]] })).toEqual(["b", "c", "a"]);
	});

	it("$join", () => {
		expect(evaluate({ $join: [", ", [1, 2, 3]] })).toBe("1, 2, 3");
		expect(evaluate({ $join: ["-", ["a", "b", "c"]] })).toBe("a-b-c");
		expect(evaluate({ $join: ["", [1, 2, 3]] })).toBe("123");
	});

	it("$reverse", () => {
		expect(evaluate({ $reverse: [1, 2, 3] })).toEqual([3, 2, 1]);
		expect(evaluate({ $reverse: ["a", "b", "c"] })).toEqual(["c", "b", "a"]);
		expect(evaluate({ $reverse: [] })).toEqual([]);
	});
});
