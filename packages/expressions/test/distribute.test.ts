import { describe, expect, it } from "vitest";
import { comparativeDefinitions } from "../src/definitions/comparative.js";
import { distribute } from "../src/distribute.js";
import { logicalDefinitions } from "../src/definitions/logical.js";

const dist = (expr) =>
	distribute(expr, { ...comparativeDefinitions, ...logicalDefinitions });

describe("expressions in the property form transforming to the canonical form", () => {
	it("works for one equality expression", () => {
		expect(dist({ name: "ximena" })).toEqual({
			$pipe: [{ $prop: "name" }, { $eq: "ximena" }],
		});
	});

	it("works for two equality expressions", () => {
		expect(dist({ name: "ximena", age: 4 })).toEqual({
			$and: [
				{ $pipe: [{ $prop: "name" }, { $eq: "ximena" }] },
				{ $pipe: [{ $prop: "age" }, { $eq: 4 }] },
			],
		});
	});

	it("allows for arrays", () => {
		expect(dist({ hobbies: ["dancing", "coloring"] })).toEqual({
			$pipe: [{ $prop: "hobbies" }, { $eq: ["dancing", "coloring"] }],
		});
	});

	it("distributes over $and", () => {
		expect(dist({ $and: [{ name: "ximena" }, { age: { $gt: 4 } }] })).toEqual({
			$and: [
				{ $pipe: [{ $prop: "name" }, { $eq: "ximena" }] },
				{ $pipe: [{ $prop: "age" }, { $gt: 4 }] },
			],
		});
	});
});

describe("filters from the canonical format", () => {
	it.todo("can be transformed into the property format");
});
