import { describe, expect, it } from "vitest";
import { applyOrMap, applyOrMapAsync, pipeThru } from "../src/index.js";

describe("applyOrMap", () => {
	it("applies function to a single item", () => {
		const result = applyOrMap(5, x => x * 2);
		expect(result).toBe(10);
	});

	it("maps function over an array", () => {
		const result = applyOrMap([1, 2, 3], x => x * 2);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns null when input is null", () => {
		const result = applyOrMap(null, x => x * 2);
		expect(result).toBe(null);
	});

	it("returns undefined when input is undefined", () => {
		const result = applyOrMap(undefined, x => x * 2);
		expect(result).toBe(undefined);
	});

	it("handles empty array", () => {
		const result = applyOrMap([], x => x * 2);
		expect(result).toEqual([]);
	});

	it("handles array with null/undefined elements", () => {
		const result = applyOrMap([1, null, 3, undefined], x => x ? x * 2 : x);
		expect(result).toEqual([2, null, 6, undefined]);
	});

	it("handles zero as valid input", () => {
		const result = applyOrMap(0, x => x + 10);
		expect(result).toBe(10);
	});

	it("handles false as valid input", () => {
		const result = applyOrMap(false, x => !x);
		expect(result).toBe(true);
	});

	it("handles empty string as valid input", () => {
		const result = applyOrMap("", x => x + "test");
		expect(result).toBe("test");
	});

	it("preserves function context and arguments", () => {
		const fn = function(x, index, array) {
			return { value: x, index, arrayLength: array ? array.length : undefined };
		};
		
		const singleResult = applyOrMap(5, fn);
		expect(singleResult).toEqual({ value: 5, index: undefined, arrayLength: undefined });

		const arrayResult = applyOrMap([1, 2], fn);
		expect(arrayResult).toEqual([
			{ value: 1, index: 0, arrayLength: 2 },
			{ value: 2, index: 1, arrayLength: 2 },
		]);
	});
});

describe("applyOrMapAsync", () => {
	it("applies async function to a single item", async () => {
		const result = await applyOrMapAsync(5, async x => x * 2);
		expect(result).toBe(10);
	});

	it("maps async function over an array", async () => {
		const result = await applyOrMapAsync([1, 2, 3], async x => x * 2);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns null when input is null", () => {
		const result = applyOrMapAsync(null, async x => x * 2);
		expect(result).toBe(null);
	});

	it("returns undefined when input is undefined", () => {
		const result = applyOrMapAsync(undefined, async x => x * 2);
		expect(result).toBe(undefined);
	});

	it("handles empty array", async () => {
		const result = await applyOrMapAsync([], async x => x * 2);
		expect(result).toEqual([]);
	});

	it("handles zero as valid input", async () => {
		const result = await applyOrMapAsync(0, async x => x + 10);
		expect(result).toBe(10);
	});

	it("handles false as valid input", async () => {
		const result = await applyOrMapAsync(false, async x => !x);
		expect(result).toBe(true);
	});

	it("handles empty string as valid input", async () => {
		const result = await applyOrMapAsync("", async x => x + "test");
		expect(result).toBe("test");
	});

	it("handles async functions with delays", async () => {
		let callOrder = [];
		const delayedDouble = async (x) => {
			callOrder.push(`start-${x}`);
			await Promise.resolve(); // Minimal async operation
			callOrder.push(`end-${x}`);
			return x * 2;
		};

		const result = await applyOrMapAsync([1, 2, 3], delayedDouble);

		expect(result).toEqual([2, 4, 6]);
		// Verify all functions were called
		expect(callOrder).toContain("start-1");
		expect(callOrder).toContain("start-2"); 
		expect(callOrder).toContain("start-3");
		expect(callOrder).toContain("end-1");
		expect(callOrder).toContain("end-2");
		expect(callOrder).toContain("end-3");
	});

	it("handles async function errors", async () => {
		const errorFn = async () => {
			throw new Error("Test error");
		};

		await expect(applyOrMapAsync(5, errorFn)).rejects.toThrow("Test error");
		await expect(applyOrMapAsync([1, 2], errorFn)).rejects.toThrow("Test error");
	});

	it("handles mixed success/failure in arrays", async () => {
		const conditionalError = async (x) => {
			if (x === 2) throw new Error("Error on 2");
			return x * 2;
		};

		await expect(applyOrMapAsync([1, 2, 3], conditionalError)).rejects.toThrow("Error on 2");
	});
});

describe("pipeThru", () => {
	it("pipes value through single function", () => {
		const add5 = x => x + 5;
		const result = pipeThru(10, [add5]);
		expect(result).toBe(15);
	});

	it("pipes value through multiple functions", () => {
		const add5 = x => x + 5;
		const multiply2 = x => x * 2;
		const toString = x => x.toString();

		const result = pipeThru(10, [add5, multiply2, toString]);
		expect(result).toBe("30");
	});

	it("handles empty function array", () => {
		const result = pipeThru(42, []);
		expect(result).toBe(42);
	});

	it("handles functions that change types", () => {
		const toArray = x => [x];
		const addElement = arr => [...arr, "added"];
		const join = arr => arr.join("-");

		const result = pipeThru(5, [toArray, addElement, join]);
		expect(result).toBe("5-added");
	});

	it("handles null/undefined initial values", () => {
		const toString = x => String(x);
		const addSuffix = x => x + "-suffix";

		expect(pipeThru(null, [toString, addSuffix])).toBe("null-suffix");
		expect(pipeThru(undefined, [toString, addSuffix])).toBe("undefined-suffix");
	});

	it("handles complex object transformations", () => {
		const addProperty = obj => ({ ...obj, newProp: "added" });
		const extractValues = obj => Object.values(obj);
		const sum = arr => arr.filter(x => typeof x === "number").reduce((a, b) => a + b, 0);

		const result = pipeThru({ a: 1, b: 2 }, [addProperty, extractValues, sum]);
		expect(result).toBe(3);
	});

	it("maintains function execution order", () => {
		const log = [];
		const fn1 = x => { log.push("fn1"); return x + 1; };
		const fn2 = x => { log.push("fn2"); return x * 2; };
		const fn3 = x => { log.push("fn3"); return x - 1; };

		const result = pipeThru(5, [fn1, fn2, fn3]);
		
		expect(result).toBe(11); // ((5 + 1) * 2) - 1
		expect(log).toEqual(["fn1", "fn2", "fn3"]);
	});

	it("handles functions that throw errors", () => {
		const add5 = x => x + 5;
		const throwError = () => { throw new Error("Test error"); };
		const multiply2 = x => x * 2;

		expect(() => pipeThru(10, [add5, throwError, multiply2])).toThrow("Test error");
	});
});