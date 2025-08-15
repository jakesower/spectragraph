import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const kids = [
	{ name: "Ximena", age: 4 },
	{ name: "Yousef", age: 5 },
	{ name: "Zoe", age: 6 },
];

const { apply } = defaultExpressionEngine;

describe("apply", () => {
	describe("$map", () => {
		it("should perform without subexpressions", () => {
			expect(apply({ $map: { $echo: {} } }, [3])).toEqual([3]);
		});

		it("should perform with a subexpression", () => {
			expect(apply({ $map: { $prop: "age" } }, kids)).toEqual([4, 5, 6]);
		});
	});

	it("$filter", () => {
		expect(apply({ $filter: { $eq: 2 } }, [1, 2, 3])).toEqual([2]);
	});
});
