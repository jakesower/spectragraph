import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const kids = {
	ximena: { name: "Ximena", age: 4 },
	yousef: { name: "Yousef", age: 5 },
	zoë: { name: "Zoë", age: 6 },
};

const { compile } = defaultExpressionEngine;

describe("the $eq expression", () => {
	it("is determined deeply", async () => {
		const compiled = compile({
			$eq: [3, { chicken: "butt" }],
		});
		expect(compiled([3, { chicken: "butt" }])).toBe(true);
	});
});

it("implements the $gt expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $gt: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $gte expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $gte: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $lt expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $lt: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(false);
});

it("implements the $lte expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $lte: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(false);
});

it("implements the $ne expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $ne: 5 }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $in expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $in: [4, 6] }] };

	expect(compile(exp)(kids.ximena)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoë)).toBe(true);
});

it("implements the $nin expression", () => {
	const exp = { $pipe: [{ $get: "age" }, { $nin: [4, 6] }] };

	expect(compile(exp)(kids.ximena)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoë)).toBe(false);
});
