import { describe, expect, it } from "vitest";
import { comparativeDefinitions } from "../src/definitions/comparative.js";
import { expressionContext } from "../src/expression.js";

const { distribute } = expressionContext(comparativeDefinitions);

describe("expressions in the property form transforming to the canonical form", () => {
	it("works for one equality expression", () => {
		expect(distribute({ name: "ximena" })).toEqual({
			$pipe: [{ $prop: "name" }, { $eq: "ximena" }],
		});
	});

	it("works for two equality expressions", () => {
		expect(distribute({ name: "ximena", age: 4 })).toEqual({
			$and: [
				{ $pipe: [{ $prop: "name" }, { $eq: "ximena" }] },
				{ $pipe: [{ $prop: "age" }, { $eq: 4 }] },
			],
		});
	});

	it("allows for arrays", () => {
		expect(distribute({ hobbies: ["dancing", "coloring"] })).toEqual({
			$pipe: [{ $prop: "hobbies" }, { $eq: ["dancing", "coloring"] }],
		});
	});

	it("transforms whole expressions untouched", () => {
		const expr = { $pipe: [{ $prop: "age" }, { $eq: 4 }] };
		expect(distribute(expr)).toEqual(expr);
	});

	it("distributes over $and", () => {
		expect(distribute({ $and: [{ name: "ximena" }, { age: { $gt: 4 } }] })).toEqual({
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
