import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const { apply } = defaultExpressionEngine;

const ages = [3, 4, 5, 6, 2];
const temperatures = [98.6, 99.1, 97.8, 100.2, 98.9];
const emptyArray = [];
const singleValue = [42];

describe("$count", () => {
	it("counts elements in an array", () => {
		expect(apply({ $count: ages }, null)).toBe(5);
	});

	it("returns 0 for empty arrays", () => {
		expect(apply({ $count: emptyArray }, null)).toBe(0);
	});

	it("counts single element", () => {
		expect(apply({ $count: singleValue }, null)).toBe(1);
	});
});

describe("$max", () => {
	it("finds maximum value in array", () => {
		expect(apply({ $max: ages }, null)).toBe(6);
	});

	it("finds maximum with decimals", () => {
		expect(apply({ $max: temperatures }, null)).toBe(100.2);
	});

	it("returns undefined for empty arrays", () => {
		expect(apply({ $max: emptyArray }, null)).toBeUndefined();
	});

	it("returns single value for single element array", () => {
		expect(apply({ $max: singleValue }, null)).toBe(42);
	});

	it("handles negative values", () => {
		expect(apply({ $max: [-5, -1, -10] }, null)).toBe(-1);
	});
});

describe("$min", () => {
	it("finds minimum value in array", () => {
		expect(apply({ $min: ages }, null)).toBe(2);
	});

	it("finds minimum with decimals", () => {
		expect(apply({ $min: temperatures }, null)).toBe(97.8);
	});

	it("returns undefined for empty arrays", () => {
		expect(apply({ $min: emptyArray }, null)).toBeUndefined();
	});

	it("returns single value for single element array", () => {
		expect(apply({ $min: singleValue }, null)).toBe(42);
	});

	it("handles negative values", () => {
		expect(apply({ $min: [-5, -1, -10] }, null)).toBe(-10);
	});
});

describe("$sum", () => {
	it("sums values in array", () => {
		expect(apply({ $sum: ages }, null)).toBe(20);
	});

	it("sums decimal values", () => {
		expect(apply({ $sum: temperatures }, null)).toBeCloseTo(494.6);
	});

	it("returns 0 for empty arrays", () => {
		expect(apply({ $sum: emptyArray }, null)).toBe(0);
	});

	it("returns single value for single element array", () => {
		expect(apply({ $sum: singleValue }, null)).toBe(42);
	});

	it("handles negative values", () => {
		expect(apply({ $sum: [-5, 3, -2] }, null)).toBe(-4);
	});

	it("handles mixed positive and negative", () => {
		expect(apply({ $sum: [10, -5, 3, -8] }, null)).toBe(0);
	});
});

describe("$mean", () => {
	it("calculates mean of ages", () => {
		expect(apply({ $mean: ages }, null)).toBe(4);
	});

	it("calculates mean with decimals", () => {
		expect(apply({ $mean: temperatures }, null)).toBeCloseTo(98.92);
	});

	it("returns undefined for empty arrays", () => {
		expect(apply({ $mean: emptyArray }, null)).toBeUndefined();
	});

	it("returns single value for single element array", () => {
		expect(apply({ $mean: singleValue }, null)).toBe(42);
	});

	it("handles negative values", () => {
		expect(apply({ $mean: [-6, -3, 0, 3, 6] }, null)).toBe(0);
	});
});

describe("$median", () => {
	it("calculates median of odd-length array", () => {
		expect(apply({ $median: ages }, null)).toBe(4);
	});

	it("calculates median of even-length array", () => {
		expect(apply({ $median: [1, 2, 3, 4] }, null)).toBe(2.5);
	});

	it("returns undefined for empty arrays", () => {
		expect(apply({ $median: emptyArray }, null)).toBeUndefined();
	});

	it("returns single value for single element array", () => {
		expect(apply({ $median: singleValue }, null)).toBe(42);
	});

	it("handles unsorted data", () => {
		expect(apply({ $median: [5, 1, 3, 2, 4] }, null)).toBe(3);
	});

	it("handles duplicate values", () => {
		expect(apply({ $median: [1, 2, 2, 3] }, null)).toBe(2);
	});
});

describe("$mode", () => {
	it("finds single mode", () => {
		expect(apply({ $mode: [1, 2, 2, 3, 4] }, null)).toBe(2);
	});

	it("finds multiple modes", () => {
		expect(apply({ $mode: [1, 1, 2, 2, 3] }, null)).toEqual([1, 2]);
	});

	it("returns undefined when no mode exists", () => {
		expect(apply({ $mode: [1, 2, 3, 4, 5] }, null)).toBeUndefined();
	});

	it("returns undefined for empty arrays", () => {
		expect(apply({ $mode: emptyArray }, null)).toBeUndefined();
	});

	it("handles single element", () => {
		expect(apply({ $mode: [5] }, null)).toBeUndefined();
	});

	it("handles all same values", () => {
		expect(apply({ $mode: [3, 3, 3, 3] }, null)).toBe(3);
	});
});

describe("$quantile", () => {
	const testData = [
		12, 5, 18, 3, 25, 8, 31, 14, 7, 22, 9, 16, 28, 11, 19, 6, 24, 13,
	];

	it("calculates quartiles (4-quantiles)", () => {
		expect(
			apply({ $quantile: { values: testData, k: 1, n: 4 } }, null),
		).toBeCloseTo(8.25);
		expect(apply({ $quantile: { values: testData, k: 2, n: 4 } }, null)).toBe(
			13.5,
		);
		expect(
			apply({ $quantile: { values: testData, k: 3, n: 4 } }, null),
		).toBeCloseTo(21.25);
	});

	it("calculates percentiles (100-quantiles)", () => {
		expect(
			apply({ $quantile: { values: testData, k: 50, n: 100 } }, null),
		).toBe(13.5);
		expect(
			apply({ $quantile: { values: testData, k: 90, n: 100 } }, null),
		).toBeCloseTo(25.9);
	});

	it("handles boundary cases", () => {
		expect(apply({ $quantile: { values: testData, k: 0, n: 4 } }, null)).toBe(
			3,
		);
		expect(apply({ $quantile: { values: testData, k: 4, n: 4 } }, null)).toBe(
			31,
		);
	});

	it("returns undefined for empty arrays", () => {
		expect(
			apply({ $quantile: { values: [], k: 1, n: 4 } }, null),
		).toBeUndefined();
	});

	it("throws error for invalid k and n", () => {
		expect(() =>
			apply({ $quantile: { values: testData, k: -1, n: 4 } }, null),
		).toThrow();
		expect(() =>
			apply({ $quantile: { values: testData, k: 5, n: 4 } }, null),
		).toThrow();
		expect(() =>
			apply({ $quantile: { values: testData, k: 1, n: 0 } }, null),
		).toThrow();
	});

	it("throws error for non-numeric k and n", () => {
		expect(() =>
			apply({ $quantile: { values: testData, k: "1", n: 4 } }, null),
		).toThrow();
		expect(() =>
			apply({ $quantile: { values: testData, k: 1, n: "4" } }, null),
		).toThrow();
	});

	it("handles single element array", () => {
		expect(apply({ $quantile: { values: [42], k: 1, n: 4 } }, null)).toBe(42);
	});
});
