import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/expressions/expressions.js";

const { apply, evaluate } = defaultExpressionEngine;

describe("$nowUTC", () => {
	it("returns current time as UTC RFC3339 string", () => {
		const before = Date.now();
		const result = apply({ $nowUTC: null }, {});
		const after = Date.now();

		expect(typeof result).toBe("string");
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

		const resultTime = new Date(result).getTime();
		expect(resultTime).toBeGreaterThanOrEqual(before);
		expect(resultTime).toBeLessThanOrEqual(after);
	});

	it("returns different times when called repeatedly", () => {
		const result1 = apply({ $nowUTC: null }, {});
		// Small delay to ensure different timestamps
		const start = Date.now();
		while (Date.now() - start < 1) {
			// Busy wait for at least 1ms
		}
		const result2 = apply({ $nowUTC: null }, {});

		expect(typeof result1).toBe("string");
		expect(typeof result2).toBe("string");
		expect(new Date(result2).getTime()).toBeGreaterThan(
			new Date(result1).getTime(),
		);
	});

	it("ignores operand and input data", () => {
		const result1 = apply({ $nowUTC: "ignored" }, { also: "ignored" });
		const result2 = apply({ $nowUTC: [1, 2, 3] }, null);

		expect(typeof result1).toBe("string");
		expect(typeof result2).toBe("string");
		expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	it("can be evaluated statically", () => {
		const before = Date.now();
		const result = evaluate({ $nowUTC: null });
		const after = Date.now();

		expect(typeof result).toBe("string");
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

		const resultTime = new Date(result).getTime();
		expect(resultTime).toBeGreaterThanOrEqual(before);
		expect(resultTime).toBeLessThanOrEqual(after);
	});
});

describe("$nowLocal", () => {
	it("returns current time as local RFC3339 string with timezone", () => {
		const result = apply({ $nowLocal: null }, {});

		expect(typeof result).toBe("string");
		// Should match RFC3339 with timezone offset
		expect(result).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		);
	});

	it("returns different times when called repeatedly", () => {
		const result1 = apply({ $nowLocal: null }, {});
		// Small delay to ensure different timestamps
		const start = Date.now();
		while (Date.now() - start < 1) {
			// Busy wait for at least 1ms
		}
		const result2 = apply({ $nowLocal: null }, {});

		expect(typeof result1).toBe("string");
		expect(typeof result2).toBe("string");
		expect(new Date(result2).getTime()).toBeGreaterThan(
			new Date(result1).getTime(),
		);
	});

	it("ignores operand and input data", () => {
		const result1 = apply({ $nowLocal: "ignored" }, { also: "ignored" });
		const result2 = apply({ $nowLocal: [1, 2, 3] }, null);

		expect(typeof result1).toBe("string");
		expect(typeof result2).toBe("string");
		expect(result1).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		);
		expect(result2).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		);
	});

	it("can be evaluated statically", () => {
		const result = evaluate({ $nowLocal: null });

		expect(typeof result).toBe("string");
		expect(result).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		);
	});
});

describe("$timestamp", () => {
	it("returns current timestamp as number", () => {
		const before = Date.now();
		const result = apply({ $timestamp: null }, {});
		const after = Date.now();

		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThanOrEqual(before);
		expect(result).toBeLessThanOrEqual(after);
	});

	it("returns different timestamps when called repeatedly", () => {
		const result1 = apply({ $timestamp: null }, {});
		// Small delay to ensure different timestamps
		const start = Date.now();
		while (Date.now() - start < 1) {
			// Busy wait for at least 1ms
		}
		const result2 = apply({ $timestamp: null }, {});

		expect(typeof result1).toBe("number");
		expect(typeof result2).toBe("number");
		expect(result2).toBeGreaterThan(result1);
	});

	it("ignores operand and input data", () => {
		const result1 = apply({ $timestamp: "ignored" }, { also: "ignored" });
		const result2 = apply({ $timestamp: [1, 2, 3] }, null);

		expect(typeof result1).toBe("number");
		expect(typeof result2).toBe("number");
	});

	it("can be evaluated statically", () => {
		const before = Date.now();
		const result = evaluate({ $timestamp: null });
		const after = Date.now();

		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThanOrEqual(before);
		expect(result).toBeLessThanOrEqual(after);
	});
});

describe("temporal expressions in complex scenarios", () => {
	it("work within conditional expressions", () => {
		const result = apply(
			{
				$if: {
					if: true,
					then: { $timestamp: null },
					else: 0,
				},
			},
			{},
		);

		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThan(0);
	});

	it("can be used in static evaluation of conditionals", () => {
		const before = Date.now();
		const result = evaluate({
			$if: {
				if: true,
				then: { $nowUTC: null },
				else: "2000-01-01T00:00:00.000Z",
			},
		});

		expect(typeof result).toBe("string");
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		expect(new Date(result).getTime()).toBeGreaterThanOrEqual(before);
	});

	it("work in case expressions", () => {
		const result = apply(
			{
				$case: {
					value: "time",
					cases: [{ when: "time", then: { $timestamp: null } }],
					default: 0,
				},
			},
			{},
		);

		expect(typeof result).toBe("number");
		expect(result).toBeGreaterThan(0);
	});

	it("temporal expressions return properly formatted strings", () => {
		const utcResult = apply({ $nowUTC: null }, {});
		const localResult = apply({ $nowLocal: null }, {});
		const timestampResult = apply({ $timestamp: null }, {});

		// Check formats
		expect(utcResult).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		expect(localResult).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		);
		expect(typeof timestampResult).toBe("number");

		// UTC should be close to timestamp
		const utcTime = new Date(utcResult).getTime();
		expect(Math.abs(utcTime - timestampResult)).toBeLessThan(100);

		// Local string should be parseable and roughly recent
		const localTime = new Date(localResult).getTime();
		expect(localTime).toBeGreaterThan(Date.now() - 1000); // Within last second
	});
});
