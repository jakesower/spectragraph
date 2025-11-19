import { describe, expect, it } from "vitest";
import {
	applyOrMap,
	applyOrMapAsync,
	get,
	pipeThru,
	promiseObjectAll,
} from "../src/index.js";

describe("applyOrMap", () => {
	it("applies function to a single item", () => {
		const result = applyOrMap(5, (x) => x * 2);
		expect(result).toBe(10);
	});

	it("maps function over an array", () => {
		const result = applyOrMap([1, 2, 3], (x) => x * 2);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns null when input is null", () => {
		const result = applyOrMap(null, (x) => x * 2);
		expect(result).toBe(null);
	});

	it("returns undefined when input is undefined", () => {
		const result = applyOrMap(undefined, (x) => x * 2);
		expect(result).toBe(undefined);
	});

	it("handles empty array", () => {
		const result = applyOrMap([], (x) => x * 2);
		expect(result).toEqual([]);
	});

	it("handles array with null/undefined elements", () => {
		const result = applyOrMap([1, null, 3, undefined], (x) => (x ? x * 2 : x));
		expect(result).toEqual([2, null, 6, undefined]);
	});

	it("handles zero as valid input", () => {
		const result = applyOrMap(0, (x) => x + 10);
		expect(result).toBe(10);
	});

	it("handles false as valid input", () => {
		const result = applyOrMap(false, (x) => !x);
		expect(result).toBe(true);
	});

	it("handles empty string as valid input", () => {
		const result = applyOrMap("", (x) => x + "test");
		expect(result).toBe("test");
	});

	it("preserves function context and arguments", () => {
		const fn = function (x, index, array) {
			return { value: x, index, arrayLength: array ? array.length : undefined };
		};

		const singleResult = applyOrMap(5, fn);
		expect(singleResult).toEqual({
			value: 5,
			index: undefined,
			arrayLength: undefined,
		});

		const arrayResult = applyOrMap([1, 2], fn);
		expect(arrayResult).toEqual([
			{ value: 1, index: 0, arrayLength: 2 },
			{ value: 2, index: 1, arrayLength: 2 },
		]);
	});
});

describe("applyOrMapAsync", () => {
	it("applies async function to a single item", async () => {
		const result = await applyOrMapAsync(5, async (x) => x * 2);
		expect(result).toBe(10);
	});

	it("maps async function over an array", async () => {
		const result = await applyOrMapAsync([1, 2, 3], async (x) => x * 2);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns null when input is null", () => {
		const result = applyOrMapAsync(null, async (x) => x * 2);
		expect(result).toBe(null);
	});

	it("returns undefined when input is undefined", () => {
		const result = applyOrMapAsync(undefined, async (x) => x * 2);
		expect(result).toBe(undefined);
	});

	it("handles empty array", async () => {
		const result = await applyOrMapAsync([], async (x) => x * 2);
		expect(result).toEqual([]);
	});

	it("handles zero as valid input", async () => {
		const result = await applyOrMapAsync(0, async (x) => x + 10);
		expect(result).toBe(10);
	});

	it("handles false as valid input", async () => {
		const result = await applyOrMapAsync(false, async (x) => !x);
		expect(result).toBe(true);
	});

	it("handles empty string as valid input", async () => {
		const result = await applyOrMapAsync("", async (x) => x + "test");
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
		await expect(applyOrMapAsync([1, 2], errorFn)).rejects.toThrow(
			"Test error",
		);
	});

	it("handles mixed success/failure in arrays", async () => {
		const conditionalError = async (x) => {
			if (x === 2) throw new Error("Error on 2");
			return x * 2;
		};

		await expect(applyOrMapAsync([1, 2, 3], conditionalError)).rejects.toThrow(
			"Error on 2",
		);
	});
});

describe("pipeThru", () => {
	it("pipes value through single function", () => {
		const add5 = (x) => x + 5;
		const result = pipeThru(10, [add5]);
		expect(result).toBe(15);
	});

	it("pipes value through multiple functions", () => {
		const add5 = (x) => x + 5;
		const multiply2 = (x) => x * 2;
		const toString = (x) => x.toString();

		const result = pipeThru(10, [add5, multiply2, toString]);
		expect(result).toBe("30");
	});

	it("handles empty function array", () => {
		const result = pipeThru(42, []);
		expect(result).toBe(42);
	});

	it("handles functions that change types", () => {
		const toArray = (x) => [x];
		const addElement = (arr) => [...arr, "added"];
		const join = (arr) => arr.join("-");

		const result = pipeThru(5, [toArray, addElement, join]);
		expect(result).toBe("5-added");
	});

	it("handles null/undefined initial values", () => {
		const toString = (x) => String(x);
		const addSuffix = (x) => x + "-suffix";

		expect(pipeThru(null, [toString, addSuffix])).toBe("null-suffix");
		expect(pipeThru(undefined, [toString, addSuffix])).toBe("undefined-suffix");
	});

	it("handles complex object transformations", () => {
		const addProperty = (obj) => ({ ...obj, newProp: "added" });
		const extractValues = (obj) => Object.values(obj);
		const sum = (arr) =>
			arr.filter((x) => typeof x === "number").reduce((a, b) => a + b, 0);

		const result = pipeThru({ a: 1, b: 2 }, [addProperty, extractValues, sum]);
		expect(result).toBe(3);
	});

	it("maintains function execution order", () => {
		const log = [];
		const fn1 = (x) => {
			log.push("fn1");
			return x + 1;
		};
		const fn2 = (x) => {
			log.push("fn2");
			return x * 2;
		};
		const fn3 = (x) => {
			log.push("fn3");
			return x - 1;
		};

		const result = pipeThru(5, [fn1, fn2, fn3]);

		expect(result).toBe(11); // ((5 + 1) * 2) - 1
		expect(log).toEqual(["fn1", "fn2", "fn3"]);
	});

	it("handles functions that throw errors", () => {
		const add5 = (x) => x + 5;
		const throwError = () => {
			throw new Error("Test error");
		};
		const multiply2 = (x) => x * 2;

		expect(() => pipeThru(10, [add5, throwError, multiply2])).toThrow(
			"Test error",
		);
	});
});

describe("get", () => {
	describe("null/undefined handling", () => {
		it("returns null when input is null", () => {
			expect(get(null, "foo")).toBe(null);
		});

		it("returns null when input is undefined", () => {
			expect(get(undefined, "foo")).toBe(null);
		});

		it("returns input when path is empty string", () => {
			const obj = { name: "test" };
			expect(get(obj, "")).toBe(obj);
		});

		it("returns input when path is single dot", () => {
			const obj = { name: "test" };
			expect(get(obj, ".")).toBe(obj);
		});

		it("returns input when path is empty array", () => {
			const obj = { name: "test" };
			expect(get(obj, [])).toBe(obj);
		});

		it("returns undefined when property doesn't exist", () => {
			const bear = { name: "Tenderheart Bear" };
			expect(get(bear, "bestFriend")).toBeUndefined();
		});

		it("returns null when traversing through null", () => {
			const obj = { nested: null };
			expect(get(obj, "nested.property")).toBe(null);
		});

		it("returns undefined when traversing through undefined", () => {
			const obj = { nested: undefined };
			expect(get(obj, "nested.property")).toBeUndefined();
		});
	});

	describe("simple property access", () => {
		it("gets top-level property", () => {
			const bear = { name: "Tenderheart Bear", yearIntroduced: 1982 };
			expect(get(bear, "name")).toBe("Tenderheart Bear");
			expect(get(bear, "yearIntroduced")).toBe(1982);
		});

		it("gets nested property with dot notation", () => {
			const bear = {
				name: "Tenderheart Bear",
				home: { name: "Care-a-Lot" },
			};
			expect(get(bear, "home.name")).toBe("Care-a-Lot");
		});

		it("gets deeply nested property", () => {
			const bear = {
				home: {
					location: {
						realm: "Cloud Kingdom",
						coordinates: { x: 100, y: 200 },
					},
				},
			};
			expect(get(bear, "home.location.realm")).toBe("Cloud Kingdom");
			expect(get(bear, "home.location.coordinates.x")).toBe(100);
			expect(get(bear, "home.location.coordinates.y")).toBe(200);
		});

		it("handles numeric properties", () => {
			const obj = { 0: "zero", 1: "one", 123: "one-two-three" };
			expect(get(obj, "0")).toBe("zero");
			expect(get(obj, "1")).toBe("one");
			expect(get(obj, "123")).toBe("one-two-three");
		});

		it("handles special characters in property names", () => {
			const obj = { "prop-with-dash": "value", "prop_with_underscores": "value2" };
			expect(get(obj, "prop-with-dash")).toBe("value");
			expect(get(obj, "prop_with_underscores")).toBe("value2");
		});
	});

	describe("bracket notation", () => {
		it("gets array element by index", () => {
			const bears = [
				{ name: "Tenderheart Bear" },
				{ name: "Cheer Bear" },
				{ name: "Wish Bear" },
			];
			expect(get(bears, "[0].name")).toBe("Tenderheart Bear");
			expect(get(bears, "[1].name")).toBe("Cheer Bear");
			expect(get(bears, "[2].name")).toBe("Wish Bear");
		});

		it("handles mixed bracket and dot notation", () => {
			const data = {
				items: [{ value: 1 }, { value: 2 }],
			};
			expect(get(data, "items[0].value")).toBe(1);
			expect(get(data, "items[1].value")).toBe(2);
		});

		it("handles consecutive brackets", () => {
			const matrix = [
				[1, 2, 3],
				[4, 5, 6],
			];
			expect(get(matrix, "[0][0]")).toBe(1);
			expect(get(matrix, "[0][2]")).toBe(3);
			expect(get(matrix, "[1][1]")).toBe(5);
		});

		it("handles string index in brackets", () => {
			const obj = { items: { first: "value" } };
			expect(get(obj, "items[first]")).toBe("value");
		});
	});

	describe("array path notation", () => {
		it("accepts path as array of strings", () => {
			const bear = {
				home: { name: "Care-a-Lot" },
			};
			expect(get(bear, ["home", "name"])).toBe("Care-a-Lot");
		});

		it("handles mixed array path with numeric indices", () => {
			const data = {
				items: [{ name: "first" }, { name: "second" }],
			};
			expect(get(data, ["items", "0", "name"])).toBe("first");
			expect(get(data, ["items", "1", "name"])).toBe("second");
		});
	});

	describe("wildcard ($) - disabled by default", () => {
		it("throws error when wildcard used without allowWildcards flag", () => {
			const bear = {
				powers: [{ name: "Care Bear Stare" }, { name: "Make a Wish" }],
			};
			expect(() => get(bear, "powers.$.name")).toThrow(
				'Wildcard ($) not supported in this context. Path: "powers.$.name"',
			);
		});

		it("throws error with array path containing wildcard", () => {
			const bear = {
				powers: [{ name: "Care Bear Stare" }],
			};
			expect(() => get(bear, ["powers", "$", "name"])).toThrow(
				'Wildcard ($) not supported in this context. Path: "powers.$.name"',
			);
		});
	});

	describe("wildcard ($) - enabled", () => {
		it("extracts property from each array element", () => {
			const bear = {
				powers: [{ name: "Care Bear Stare" }, { name: "Make a Wish" }],
			};
			expect(get(bear, "powers.$.name", true)).toEqual([
				"Care Bear Stare",
				"Make a Wish",
			]);
		});

		it("handles wildcard with non-array value by wrapping in array", () => {
			const bear = {
				power: { name: "Care Bear Stare" },
			};
			expect(get(bear, "power.$.name", true)).toEqual(["Care Bear Stare"]);
		});

		it("returns array when wildcard is at end of path", () => {
			const bear = {
				powers: [{ name: "Care Bear Stare" }, { name: "Make a Wish" }],
			};
			expect(get(bear, "powers.$", true)).toEqual([
				{ name: "Care Bear Stare" },
				{ name: "Make a Wish" },
			]);
		});

		it("flattens nested arrays with multiple wildcards", () => {
			const home = {
				residents: [
					{
						name: "Tenderheart Bear",
						powers: [{ name: "Care Bear Stare" }],
					},
					{
						name: "Cheer Bear",
						powers: [{ name: "Care Bear Stare" }],
					},
				],
			};
			expect(get(home, "residents.$.powers.$.name", true)).toEqual([
				"Care Bear Stare",
				"Care Bear Stare",
			]);
		});

		it("handles wildcard with empty array", () => {
			const bear = { powers: [] };
			expect(get(bear, "powers.$.name", true)).toEqual([]);
		});

		it("includes null/undefined in results when array element is null/undefined", () => {
			const data = {
				items: [{ name: "A" }, null, { name: "B" }, undefined],
			};
			expect(get(data, "items.$.name", true)).toEqual(["A", null, "B", null]);
		});

		it("handles complex nested wildcard paths", () => {
			const kingdom = {
				realms: [
					{
						name: "Cloud Kingdom",
						homes: [
							{
								name: "Care-a-Lot",
								residents: [{ name: "Tenderheart" }, { name: "Cheer" }],
							},
						],
					},
				],
			};
			// flatMap flattens one level, so nested wildcards flatten to single array
			expect(
				get(kingdom, "realms.$.homes.$.residents.$.name", true),
			).toEqual(["Tenderheart", "Cheer"]);
		});

		it("handles wildcard at different positions", () => {
			const data = {
				groups: [
					{ items: [{ value: 1 }, { value: 2 }] },
					{ items: [{ value: 3 }, { value: 4 }] },
				],
			};
			// flatMap flattens the results from each group into a single array
			expect(get(data, "groups.$.items.$.value", true)).toEqual([1, 2, 3, 4]);
		});
	});

	describe("edge cases", () => {
		it("handles zero as property name", () => {
			const obj = { 0: "zero-value" };
			expect(get(obj, "0")).toBe("zero-value");
		});

		it("handles false as property value", () => {
			const obj = { flag: false };
			expect(get(obj, "flag")).toBe(false);
		});

		it("handles empty string as property value", () => {
			const obj = { text: "" };
			expect(get(obj, "text")).toBe("");
		});

		it("handles null as property value", () => {
			const obj = { value: null };
			expect(get(obj, "value")).toBe(null);
		});

		it("handles array as root object", () => {
			const arr = [{ name: "first" }, { name: "second" }];
			expect(get(arr, "[0].name")).toBe("first");
			expect(get(arr, "0.name")).toBe("first");
		});

		it("handles very long paths", () => {
			const obj = { a: { b: { c: { d: { e: { f: "deep" } } } } } };
			expect(get(obj, "a.b.c.d.e.f")).toBe("deep");
		});
	});

	describe("real-world Care Bears examples", () => {
		const careBearData = {
			type: "bears",
			id: "1",
			attributes: {
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
			},
			relationships: {
				home: { type: "homes", id: 1 },
				powers: [
					{ type: "powers", id: "careBearStare" },
					{ type: "powers", id: "healing" },
				],
			},
		};

		it("accesses resource attributes", () => {
			expect(get(careBearData, "attributes.name")).toBe("Tenderheart Bear");
			expect(get(careBearData, "attributes.yearIntroduced")).toBe(1982);
		});

		it("accesses relationship data", () => {
			expect(get(careBearData, "relationships.home.id")).toBe(1);
			expect(get(careBearData, "relationships.home.type")).toBe("homes");
		});

		it("extracts relationship IDs with wildcard", () => {
			expect(get(careBearData, "relationships.powers.$.id", true)).toEqual([
				"careBearStare",
				"healing",
			]);
		});
	});
});

describe("promiseObjectAll", () => {
	it("resolves object with all promises resolved", async () => {
		const obj = {
			a: Promise.resolve(1),
			b: Promise.resolve(2),
			c: Promise.resolve(3),
		};
		const result = await promiseObjectAll(obj);
		expect(result).toEqual({ a: 1, b: 2, c: 3 });
	});

	it("handles empty object", async () => {
		const result = await promiseObjectAll({});
		expect(result).toEqual({});
	});

	it("handles mixed value types", async () => {
		const obj = {
			str: Promise.resolve("hello"),
			num: Promise.resolve(42),
			bool: Promise.resolve(true),
			nil: Promise.resolve(null),
			obj: Promise.resolve({ nested: "value" }),
			arr: Promise.resolve([1, 2, 3]),
		};
		const result = await promiseObjectAll(obj);
		expect(result).toEqual({
			str: "hello",
			num: 42,
			bool: true,
			nil: null,
			obj: { nested: "value" },
			arr: [1, 2, 3],
		});
	});

	it("handles async delays", async () => {
		const obj = {
			fast: Promise.resolve("fast"),
			slow: new Promise((resolve) => setTimeout(() => resolve("slow"), 10)),
		};
		const result = await promiseObjectAll(obj);
		expect(result).toEqual({ fast: "fast", slow: "slow" });
	});

	it("rejects if any promise rejects", async () => {
		const obj = {
			a: Promise.resolve(1),
			b: Promise.reject(new Error("Test error")),
			c: Promise.resolve(3),
		};
		await expect(promiseObjectAll(obj)).rejects.toThrow("Test error");
	});

	it("preserves key order", async () => {
		const obj = {
			z: Promise.resolve("last"),
			a: Promise.resolve("first"),
			m: Promise.resolve("middle"),
		};
		const result = await promiseObjectAll(obj);
		expect(Object.keys(result)).toEqual(["z", "a", "m"]);
	});

	it("handles promises that resolve to undefined", async () => {
		const obj = {
			defined: Promise.resolve("value"),
			undefined: Promise.resolve(undefined),
		};
		const result = await promiseObjectAll(obj);
		expect(result).toEqual({ defined: "value", undefined: undefined });
	});

	it("works with Care Bears data", async () => {
		const fetchBear = async (id) => ({
			id,
			name: id === "1" ? "Tenderheart Bear" : "Cheer Bear",
		});

		const obj = {
			bear1: fetchBear("1"),
			bear2: fetchBear("2"),
		};

		const result = await promiseObjectAll(obj);
		expect(result).toEqual({
			bear1: { id: "1", name: "Tenderheart Bear" },
			bear2: { id: "2", name: "Cheer Bear" },
		});
	});
});
