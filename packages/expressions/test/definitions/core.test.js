import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const { apply } = defaultExpressionEngine;

describe("$ensurePath", () => {
	it("echo with a valid path", () => {
		expect(apply({ $ensurePath: "name" }, { name: "Arnar" })).toEqual({
			name: "Arnar",
		});
	});

	it("echo with a valid nested path", () => {
		expect(
			apply({ $ensurePath: "hello.name" }, { hello: { name: "Arnar" } }),
		).toEqual({ hello: { name: "Arnar" } });
	});

	it("throws filtering on invalid attribute names", () => {
		expect(() => {
			apply({ $ensurePath: "hello.name" }, { name: "Arnar" });
		}).toThrowError();
	});

	describe("evaluate form", () => {
		const { evaluate } = defaultExpressionEngine;

		it("validates object has a valid path", () => {
			expect(
				evaluate({ $ensurePath: [{ name: "Arnar" }, "name"] }),
			).toEqual({ name: "Arnar" });
		});

		it("validates object has a valid nested path", () => {
			expect(
				evaluate({ $ensurePath: [{ hello: { name: "Arnar" } }, "hello.name"] }),
			).toEqual({ hello: { name: "Arnar" } });
		});

		it("throws when object missing a path", () => {
			expect(() => {
				evaluate({ $ensurePath: [{ name: "Arnar" }, "hello.name"] });
			}).toThrowError();
		});

		it("throws when object missing a nested path", () => {
			expect(() => {
				evaluate({ $ensurePath: [{ hello: {} }, "hello.name"] });
			}).toThrowError();
		});

		it("works with deeply nested paths", () => {
			expect(
				evaluate({ $ensurePath: [{ a: { b: { c: { d: "found" } } } }, "a.b.c.d"] }),
			).toEqual({ a: { b: { c: { d: "found" } } } });
		});

		it("throws when deeply nested path is incomplete", () => {
			expect(() => {
				evaluate({ $ensurePath: [{ a: { b: { c: {} } } }, "a.b.c.d"] });
			}).toThrowError();
		});

		it("throws with non-array operand", () => {
			expect(() => {
				evaluate({ $ensurePath: "user.name" });
			}).toThrowError("$ensurePath evaluate form requires array operand: [object, path]");
		});
	});
});

describe("$isDefined", () => {
	describe("evaluate form", () => {
		const { evaluate } = defaultExpressionEngine;

		it("returns true for defined values", () => {
			expect(evaluate({ $isDefined: ["hello"] })).toBe(true);
			expect(evaluate({ $isDefined: [0] })).toBe(true);
			expect(evaluate({ $isDefined: [false] })).toBe(true);
			expect(evaluate({ $isDefined: [null] })).toBe(true);
		});

		it("returns false for undefined values", () => {
			expect(evaluate({ $isDefined: [undefined] })).toBe(false);
		});

		it("works with complex values", () => {
			expect(evaluate({ $isDefined: [{ name: "test" }] })).toBe(true);
			expect(evaluate({ $isDefined: [[1, 2, 3]] })).toBe(true);
		});

		it("throws with non-array operand", () => {
			expect(() => {
				evaluate({ $isDefined: null });
			}).toThrowError("$isDefined evaluate form requires array operand: [value]");
		});
	});
});

describe("$echo", () => {
	describe("evaluate form", () => {
		const { evaluate } = defaultExpressionEngine;

		it("echoes the provided value", () => {
			expect(
				evaluate({ $echo: ["hello world"] }),
			).toEqual("hello world");
		});

		it("echoes objects", () => {
			const obj = { name: "Arnar", age: 30 };
			expect(
				evaluate({ $echo: [obj] }),
			).toEqual(obj);
		});

		it("echoes arrays", () => {
			const arr = [1, 2, 3];
			expect(
				evaluate({ $echo: [arr] }),
			).toEqual(arr);
		});

		it("throws with non-array operand", () => {
			expect(() => {
				evaluate({ $echo: null });
			}).toThrowError("$echo evaluate form requires array operand: [value]");
		});
	});
});

describe("$get", () => {
	describe("evaluate form", () => {
		const { evaluate } = defaultExpressionEngine;

		it("gets value from object using array syntax", () => {
			expect(
				evaluate({ $get: [{ name: "Arnar", age: 30 }, "name"] }),
			).toEqual("Arnar");
		});

		it("gets nested value from object", () => {
			expect(
				evaluate({ $get: [{ user: { name: "Arnar" } }, "user.name"] }),
			).toEqual("Arnar");
		});

		it("throws with non-array operand", () => {
			expect(() => {
				evaluate({ $get: "name" });
			}).toThrowError("$get evaluate form requires array operand: [object, path]");
		});

		it("throws with object operand", () => {
			expect(() => {
				evaluate({ $get: { object: {}, path: "name" } });
			}).toThrowError("$get evaluate form requires array operand: [object, path]");
		});
	});
});

describe("$if", () => {
	it("handles a true value", () => {
		expect(
			apply({ $if: { if: { $eq: "Arnar" }, then: "yep", else: "nope" } }, "Arnar"),
		).toEqual("yep");
	});

	it("handles a false value", () => {
		expect(
			apply(
				{ $if: { if: { $eq: "Arnar" }, then: "yep", else: "nope" } },
				"Sakura",
			),
		).toEqual("nope");
	});

	it("handles a true expression", () => {
		expect(
			apply(
				{
					$if: {
						if: { $eq: { name: "Arnar" } },
						then: { $get: "name" },
						else: "nope",
					},
				},
				{ name: "Arnar" },
			),
		).toEqual("Arnar");
	});

	it("handles a false expression", () => {
		expect(
			apply(
				{
					$if: {
						if: { $eq: { name: "Arnar" } },
						then: "yep",
						else: { $get: "age" },
					},
				},
				{ name: "Sakura", age: 50 },
			),
		).toEqual(50);
	});

	it("handles a true if value", () => {
		expect(
			apply({ $if: { if: true, then: "yep", else: "nope" } }, "Arnar"),
		).toEqual("yep");
	});

	it("handles a false if value", () => {
		expect(
			apply({ $if: { if: false, then: "yep", else: "nope" } }, "Arnar"),
		).toEqual("nope");
	});

	it("throws with an non-expression/non-boolean if value", () => {
		expect(() => {
			apply({ $if: { if: "Chicken", then: "yep", else: "nope" } }, "Sakura");
		}).toThrowError();
	});
});

describe("$compose", () => {
	it("composes expressions right-to-left (mathematical order)", () => {
		expect(apply({ $compose: [{ $get: "name" }] }, { name: "Zarina" })).toEqual(
			"Zarina",
		);
	});

	it("composes multiple expressions in mathematical order", () => {
		// $compose: [f, g, h] means f(g(h(x))) - mathematical composition
		const result = apply(
			{
				$compose: [
					{ $get: "name" },           // f: get name
					{ $echo: null },            // g: identity
					{ $get: "child" },          // h: get child
				],
			},
			{ child: { name: "Fatoumata" } },
		);
		expect(result).toEqual("Fatoumata");
	});

	it("throws with an invalid expression", () => {
		expect(() => {
			apply({ $compose: [{ $in: "should be an array" }] }, { name: "Zarina" });
		}).toThrowError();
	});
});

describe("$pipe", () => {
	it("pipes expressions left-to-right (pipeline order)", () => {
		expect(apply({ $pipe: [{ $get: "name" }] }, { name: "Zarina" })).toEqual(
			"Zarina",
		);
	});

	it("pipes multiple expressions in pipeline order", () => {
		// $pipe: [h, g, f] means f(g(h(x))) - pipeline order
		const result = apply(
			{
				$pipe: [
					{ $get: "child" },          // h: get child
					{ $echo: null },            // g: identity
					{ $get: "name" },           // f: get name
				],
			},
			{ child: { name: "Fatoumata" } },
		);
		expect(result).toEqual("Fatoumata");
	});

	it("demonstrates the difference between $compose and $pipe", () => {
		const data = { child: { name: "Fatoumata" } };

		// $compose: [f, g, h] means f(g(h(x)))
		const composeResult = apply(
			{
				$compose: [
					{ $get: "name" },           // f
					{ $get: "child" },          // g
				],
			},
			data,
		);

		// $pipe: [h, g, f] means f(g(h(x)))
		const pipeResult = apply(
			{
				$pipe: [
					{ $get: "child" },          // h
					{ $get: "name" },           // g
				],
			},
			data,
		);

		expect(composeResult).toEqual("Fatoumata");
		expect(pipeResult).toEqual("Fatoumata");
	});

	it("throws with an invalid expression", () => {
		expect(() => {
			apply({ $pipe: [{ $in: "should be an array" }] }, { name: "Zarina" });
		}).toThrowError();
	});
});

describe("$case", () => {
	it("matches first case", () => {
		expect(
			apply(
				{
					$case: {
						value: "playing",
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
							{ when: "eating", then: "Child is eating" },
						],
						default: "Unknown activity",
					},
				},
				{},
			),
		).toEqual("Child is playing");
	});

	it("matches second case", () => {
		expect(
			apply(
				{
					$case: {
						value: "napping",
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
							{ when: "eating", then: "Child is eating" },
						],
						default: "Unknown activity",
					},
				},
				{},
			),
		).toEqual("Child is napping");
	});

	it("returns default when no case matches", () => {
		expect(
			apply(
				{
					$case: {
						value: "crying",
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
							{ when: "eating", then: "Child is eating" },
						],
						default: "Unknown activity",
					},
				},
				{},
			),
		).toEqual("Unknown activity");
	});

	it("handles expressions in value", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "activity" },
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
						],
						default: "Unknown activity",
					},
				},
				{ activity: "playing" },
			),
		).toEqual("Child is playing");
	});

	it("handles expressions in when", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "activity" },
						cases: [
							{ when: { $get: "playStatus" }, then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
						],
						default: "Unknown activity",
					},
				},
				{ activity: "playing", playStatus: "playing" },
			),
		).toEqual("Child is playing");
	});

	it("handles expressions in then", () => {
		expect(
			apply(
				{
					$case: {
						value: "playing",
						cases: [
							{ when: "playing", then: { $get: "message" } },
							{ when: "napping", then: "Child is napping" },
						],
						default: "Unknown activity",
					},
				},
				{ message: "Child is playing" },
			),
		).toEqual("Child is playing");
	});

	it("handles expressions in default", () => {
		expect(
			apply(
				{
					$case: {
						value: "crying",
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
						],
						default: { $get: "defaultMessage" },
					},
				},
				{ defaultMessage: "Unknown activity" },
			),
		).toEqual("Unknown activity");
	});

	it("evaluates value only once", () => {
		let callCount = 0;
		const testData = {
			get activity() {
				callCount++;
				return "playing";
			},
		};

		apply(
			{
				$case: {
					value: { $get: "activity" },
					cases: [
						{ when: "playing", then: "Child is playing" },
						{ when: "napping", then: "Child is napping" },
						{ when: "eating", then: "Child is eating" },
					],
					default: "Unknown activity",
				},
			},
			testData,
		);

		expect(callCount).toBe(1);
	});

	it("handles complex expressions in when clause", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "activity" },
						cases: [
							{ when: { $eq: "playing" }, then: "Child is playing" },
							{
								when: { $in: ["napping", "resting"] },
								then: "Child is resting",
							},
							{ when: "eating", then: "Child is eating" },
						],
						default: "Unknown activity",
					},
				},
				{ activity: "napping" },
			),
		).toEqual("Child is resting");
	});

	it("handles numeric comparisons in when clause", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "age" },
						cases: [
							{ when: { $lt: 2 }, then: "Toddler" },
							{ when: { $lt: 5 }, then: "Preschooler" },
							{ when: { $gte: 5 }, then: "School age" },
						],
						default: "Unknown age group",
					},
				},
				{ age: 4 },
			),
		).toEqual("Preschooler");
	});

	it("handles complex logical expressions in when clause", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "child" },
						cases: [
							{
								when: {
									$and: [{ $get: "isPottyTrained" }, { $get: "isNapping" }],
								},
								then: "Ready for preschool",
							},
							{
								when: { $get: "isNapping" },
								then: "Needs more training",
							},
						],
						default: "Needs attention",
					},
				},
				{ child: { isPottyTrained: true, isNapping: true } },
			),
		).toEqual("Ready for preschool");
	});

	it("handles mixed simple and complex when clauses", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "activity" },
						cases: [
							{ when: "playing", then: "Child is playing" },
							{
								when: { $in: ["napping", "resting"] },
								then: "Child is resting",
							},
							{ when: "eating", then: "Child is eating" },
						],
						default: "Unknown activity",
					},
				},
				{ activity: "playing" },
			),
		).toEqual("Child is playing");
	});

	it("prioritizes first matching case", () => {
		expect(
			apply(
				{
					$case: {
						value: { $get: "age" },
						cases: [
							{ when: { $gte: 0 }, then: "Any age" },
							{ when: { $gte: 5 }, then: "School age" },
						],
						default: "No age",
					},
				},
				{ age: 6 },
			),
		).toEqual("Any age");
	});
});

