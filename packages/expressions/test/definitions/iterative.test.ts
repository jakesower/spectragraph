import { describe, expect, it } from "vitest";
import { createDefaultExpressionEngine } from "../../src/expressions.js";
import { iterativeDefinitions } from "../../src/definitions/iterative.js";
import { mathDefinitions } from "../../src/definitions/math.js";

const kids = [
	{ name: "Ximena", age: 4 },
	{ name: "Yousef", age: 5 },
	{ name: "Zoe", age: 6 },
];

const { evaluate } = createDefaultExpressionEngine({
	...mathDefinitions,
	...iterativeDefinitions,
});

describe("$map", () => {
	it("should perform without subexpressions", () => {
		expect(
			evaluate({
				$map: [[3], { $input: {} }],
			}),
		).toEqual([3]);
	});

	it("should perform with a subexpression in the first spot", () => {
		expect(
			evaluate({
				$map: [{ $echo: [3] }, { $input: {} }],
			}),
		).toEqual([3]);
	});

	it("should perform with a subexpression in the second spot", () => {
		expect(
			evaluate({
				$map: [kids, { $prop: "age" }],
			}),
		).toEqual([4, 5, 6]);
	});
});

it("$filter", () => {
	expect(evaluate({ $filter: [[1, 2, 3], { $eq: 2 }] })).toEqual([2]);
});
