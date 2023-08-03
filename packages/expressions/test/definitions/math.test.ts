import { expect, it } from "vitest";
import { createDefaultExpressionEngine } from "../../src/expressions.js";

const { evaluate } = createDefaultExpressionEngine();

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
