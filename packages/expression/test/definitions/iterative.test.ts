import { describe, expect, it } from "vitest";
import { createExpressionEngine } from "../../src/expression.js";
import { iterativeDefinitions } from "../../src/definitions/iterative.js";
import { mathDefinitions } from "../../src/definitions/math.js";

const kids = {
	xinema: { name: "Ximena", age: 4 },
	yousef: { name: "Yousef", age: 5 },
	zoe: { name: "Zoe", age: 6 },
};

const { evaluate } = createExpressionEngine({
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
});
