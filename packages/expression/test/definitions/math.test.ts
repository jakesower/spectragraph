import { expect, it } from "vitest";
import { createExpressionEngine } from "../../src/expression.js";
import { mathDefinitions } from "../../src/definitions/math.js";

const { evaluate } = createExpressionEngine(mathDefinitions);

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
