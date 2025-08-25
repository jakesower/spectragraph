import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/index.js";

const { evaluate } = defaultExpressionEngine;

// describe("apply", () => {
// 	it("$count", () => {
// 		expect(apply({ $count: {} }, [3, { chicken: "butt" }])).toBe(2);
// 	});

// 	it("$max", () => {
// 		expect(apply({ $max: {} }, [3, 66])).toBe(66);
// 	});

// 	it("$min", () => {
// 		expect(apply({ $min: {} }, [3, 66])).toBe(3);
// 	});

// 	it("$sum", () => {
// 		expect(apply({ $sum: {} }, [3, 66])).toBe(69);
// 	});
// });

describe("evaluate", () => {
	it("$count", () => {
		expect(
			evaluate({
				$count: [3, { chicken: "butt" }],
			}),
		).toBe(2);
	});

	it("$max", () => {
		expect(
			evaluate({
				$max: [3, 66],
			}),
		).toBe(66);
	});

	it("$min", () => {
		expect(
			evaluate({
				$min: [3, 66],
			}),
		).toBe(3);
	});

	it("$sum", () => {
		expect(
			evaluate({
				$sum: [3, 4, 5],
			}),
		).toBe(12);
	});
});
