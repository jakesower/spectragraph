import { describe, expect, it } from "vitest";
import { createExpressionEngine } from "../src/expressions.js";
import { comparativeDefinitions } from "../src/definitions/comparative.js";

const kids = {
	xinema: { name: "Ximena", age: 4, toy: "ball" },
	yousef: { name: "Yousef", age: 5, toy: "doll" },
	zoe: { name: "Zoe", age: 6, toy: "boat" },
};

const { compile } = createExpressionEngine(comparativeDefinitions);

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
		const exp = { $literal: { $var: "age" } };
		const compiled = compile(exp);
		expect(compiled(kids.xinema)).toEqual({ $var: "age" });
	});

	it("looks up a variable", () => {
		expect(compile({ $prop: "age" })(kids.xinema)).toEqual(4);
	});

	it("evaluates expressions in arrays", () => {
		const compiled = compile({ $echo: [{ $prop: "age" }, { $prop: "name" }] });
		expect(compiled(kids.yousef)).toEqual([5, "Yousef"]);
	});

	it("evaluates expressions in objects", () => {
		const compiled = compile({
			$echo: { age: { $prop: "age" }, name: { $prop: "name" } },
		});
		expect(compiled(kids.zoe)).toEqual({ age: 6, name: "Zoe" });
	});

	it("pipes expressions", () => {
		const compiled = compile({ $pipe: [{ $prop: "age" }, { $eq: 6 }] });
		expect(compiled(kids.zoe)).toEqual(true);
	});
});
