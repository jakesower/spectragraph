import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../src/index.js";

const kids = {
	xinema: { name: "Ximena", age: 4, toy: "ball" },
	yousef: { name: "Yousef", age: 5, toy: "doll" },
	zoe: { name: "Zoe", age: 6, toy: "boat" },
};

const { compile } = defaultExpressionEngine;

describe("core expressions (plus $eq for help)", () => {
	it("should compile an equality expression", () => {
		const compiled = compile({ $eq: 3 });
		expect(compiled).toBeTypeOf("function");
	});

	it("should not allow non-expressions to be compiled", async () => {
		await expect(async () => {
			compile({ $notAnExpression: 4 });
		}).rejects.toThrowError();
	});

	// it("should treat non-expression objects as literals", async () => {
	// 	const compiled = compile({ $notAnExpression: 4 });
	// 	expect(compiled("hola")).toEqual({ $notAnExpression: 4 });
	// });

	it("doesn't compile contents of $literal expressions", () => {
		const exp = { $literal: { $prop: "age" } };
		const compiled = compile(exp);
		expect(compiled(kids.xinema)).toEqual({ $prop: "age" });
	});

	it("looks up a variable", () => {
		expect(compile({ $prop: "age" })(kids.xinema)).toEqual(4);
	});

	it("evaluates expressions in arrays", () => {
		const compiled = compile({ $apply: [{ $prop: "age" }, { $prop: "name" }] });
		expect(compiled(kids.yousef)).toEqual([5, "Yousef"]);
	});

	it("evaluates expressions in objects", () => {
		const compiled = compile({
			$apply: { age: { $prop: "age" }, name: { $prop: "name" } },
		});
		expect(compiled(kids.zoe)).toEqual({ age: 6, name: "Zoe" });
	});

	it("pipes expressions", () => {
		const compiled = compile({ $pipe: [{ $prop: "age" }, { $eq: 6 }] });
		expect(compiled(kids.zoe)).toEqual(true);
	});
});
