import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../src/index.js";

const kids = {
	xinema: { name: "Ximena", age: 4 },
	yousef: { name: "Yousef", age: 5 },
	zoe: { name: "Zoe", age: 6 },
};

const { compile } = defaultExpressionEngine;

describe("the $eq expression", () => {
	it("is determined deeply", async (t) => {
		const compiled = compile({
			$eq: [3, { chicken: "butt" }],
		});
		expect(compiled([3, { chicken: "butt" }])).toBe(true);
	});
});

it("implements the $gt expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $gt: 5 }] };

	expect(compile(exp)(kids.xinema)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoe)).toBe(true);
});

it("implements the $gte expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $gte: 5 }] };

	expect(compile(exp)(kids.xinema)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoe)).toBe(true);
});

it("implements the $lt expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $lt: 5 }] };

	expect(compile(exp)(kids.xinema)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoe)).toBe(false);
});

it("implements the $lte expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $lte: 5 }] };

	expect(compile(exp)(kids.xinema)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoe)).toBe(false);
});

it("implements the $ne expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $ne: 5 }] };

	expect(compile(exp)(kids.xinema)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoe)).toBe(true);
});

it("implements the $in expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $in: [4, 6] }] };

	expect(compile(exp)(kids.xinema)).toBe(true);
	expect(compile(exp)(kids.yousef)).toBe(false);
	expect(compile(exp)(kids.zoe)).toBe(true);
});

it("implements the $nin expression", () => {
	const exp = { $compose: [{ $prop: "age" }, { $nin: [4, 6] }] };

	expect(compile(exp)(kids.xinema)).toBe(false);
	expect(compile(exp)(kids.yousef)).toBe(true);
	expect(compile(exp)(kids.zoe)).toBe(false);
});
