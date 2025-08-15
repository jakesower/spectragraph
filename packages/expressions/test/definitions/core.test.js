import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const kids = [
	{ name: "Ximena", age: 4 },
	{ name: "Yousef", age: 5 },
	{ name: "Zoe", age: 6 },
];

const { apply } = defaultExpressionEngine;

describe("$ensurePath", () => {
	it("echo with a valid path", () => {
		expect(apply({ $ensurePath: "name" }, { name: "Bob" })).toEqual({
			name: "Bob",
		});
	});

	it("echo with a valid nested path", () => {
		expect(
			apply({ $ensurePath: "hello.name" }, { hello: { name: "Bob" } }),
		).toEqual({ hello: { name: "Bob" } });
	});

	it("throws filtering on invalid attribute names", () => {
		expect(() => {
			apply({ $ensurePath: "hello.name" }, { name: "Bob" });
		}).toThrowError();
	});
});

describe("$if", () => {
	it("handles a true value", () => {
		expect(
			apply(
				{ $if: { condition: { $eq: "Bob" }, then: "yep", else: "nope" } },
				"Bob",
			),
		).toEqual("yep");
	});

	it("handles a false value", () => {
		expect(
			apply(
				{ $if: { condition: { $eq: "Bob" }, then: "yep", else: "nope" } },
				"Alice",
			),
		).toEqual("nope");
	});

	it("handles a true expression", () => {
		expect(
			apply(
				{
					$if: {
						condition: { $eq: { name: "Bob" } },
						then: { $get: "name" },
						else: "nope",
					},
				},
				{ name: "Bob" },
			),
		).toEqual("Bob");
	});

	it("handles a false expression", () => {
		expect(
			apply(
				{
					$if: {
						condition: { $eq: { name: "Bob" } },
						then: "yep",
						else: { $get: "age" },
					},
				},
				{ name: "Alice", age: 50 },
			),
		).toEqual(50);
	});

	it("handles a true if value", () => {
		expect(
			apply({ $if: { condition: true, then: "yep", else: "nope" } }, "Bob"),
		).toEqual("yep");
	});

	it("handles a false if value", () => {
		expect(
			apply({ $if: { condition: false, then: "yep", else: "nope" } }, "Bob"),
		).toEqual("nope");
	});

	it("throws with an non-expression/non-boolean if value", () => {
		expect(() => {
			apply(
				{ $if: { condition: "Chicken", then: "yep", else: "nope" } },
				"Alice",
			);
		}).toThrowError();
	});
});

describe("$compose", () => {
	it("pipes through expressions", () => {
		expect(apply({ $compose: [{ $get: "name" }] }, { name: "Bob" })).toEqual(
			"Bob",
		);
	});

	it("throws with an invalid expression", () => {
		expect(() => {
			apply({ $compose: [{ $in: "hello.name" }] }, { name: "Bob" });
		}).toThrowError();
	});
});
