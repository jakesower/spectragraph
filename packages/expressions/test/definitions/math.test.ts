import { expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/expressions.js";

const { evaluate } = defaultExpressionEngine;

it("$count", () => {
	expect(
		evaluate({
			$count: [3, { chicken: "butt" }],
		}),
	).toBe(2);
});

it("$sum", () => {
	expect(
		evaluate({
			$sum: [3, 4, 5],
		}),
	).toBe(12);
});
