import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/index.js";

const { apply, evaluate } = defaultExpressionEngine;

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

	describe("evaluate form", () => {
		it("evaluates simple case matching", () => {
			const result = evaluate({
				$case: [
					{
						value: "playing",
						cases: [
							{ when: "playing", then: "Child is playing" },
							{ when: "napping", then: "Child is napping" },
						],
						default: "Unknown",
					},
					"playing",
				],
			});
			expect(result).toEqual("Child is playing");
		});
	});
});

describe("$if", () => {
	it("handles a true value", () => {
		expect(
			apply(
				{ $if: { if: { $eq: "Arnar" }, then: "yep", else: "nope" } },
				"Arnar",
			),
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

	describe("evaluate form", () => {
		it("evaluates with boolean condition", () => {
			expect(evaluate({ $if: { if: true, then: "yes", else: "no" } })).toEqual(
				"yes",
			);
			expect(evaluate({ $if: { if: false, then: "yes", else: "no" } })).toEqual(
				"no",
			);
		});

		it("evaluates with expression condition", () => {
			expect(
				evaluate({
					$if: { if: { $eq: [5, 5] }, then: "equal", else: "not equal" },
				}),
			).toEqual("equal");
			expect(
				evaluate({
					$if: { if: { $eq: [5, 3] }, then: "equal", else: "not equal" },
				}),
			).toEqual("not equal");
		});
	});
});
