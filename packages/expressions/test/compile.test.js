import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../src/index.js";

const kids = {
	xinema: { name: "Ximena", age: 4, toy: "ball" },
	yousef: { name: "Yousef", age: 5, toy: "doll" },
	zoë: { name: "Zoë", age: 6, toy: "boat" },
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
		const exp = { $literal: { $get: "age" } };
		const compiled = compile(exp);
		expect(compiled(kids.xinema)).toEqual({ $get: "age" });
	});

	it("looks up a variable", () => {
		expect(compile({ $get: "age" })(kids.xinema)).toEqual(4);
	});

	it("evaluates expressions in arrays", () => {
		const compiled = compile({ $apply: [{ $get: "age" }, { $get: "name" }] });
		expect(compiled(kids.yousef)).toEqual([5, "Yousef"]);
	});

	it("evaluates expressions in objects", () => {
		const compiled = compile({
			$apply: { age: { $get: "age" }, name: { $get: "name" } },
		});
		expect(compiled(kids.zoë)).toEqual({ age: 6, name: "Zoë" });
	});

	it("pipes expressions", () => {
		const compiled = compile({ $pipe: [{ $get: "age" }, { $eq: 6 }] });
		expect(compiled(kids.zoë)).toEqual(true);
	});
});
