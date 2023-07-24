import { expect, it } from "vitest";
import { createDefaultExpressionEngine } from "../../src/expressions.js";
import { mathDefinitions } from "../../src/definitions/math.js";

const { evaluate } = createDefaultExpressionEngine(mathDefinitions);

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
