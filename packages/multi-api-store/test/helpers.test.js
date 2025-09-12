import { describe, it, expect, vi } from "vitest";
import {
	compileFormatter,
	compileWhereFormatter,
	compileOrderFormatter,
	compileResourceMappers,
	buildAsyncMiddlewarePipe,
} from "../src/helpers/helpers.js";

describe("compileFormatter", () => {
	it("compiles templates with variable substitution", () => {
		const templates = {
			ascending: "ORDER BY ${attribute} ASC",
			descending: "ORDER BY ${attribute} DESC",
		};
		const formatter = compileFormatter(templates, "direction", ["attribute"]);

		expect(formatter({ direction: "ascending", attribute: "name" })).toBe(
			"ORDER BY name ASC",
		);
		expect(formatter({ direction: "descending", attribute: "age" })).toBe(
			"ORDER BY age DESC",
		);
	});

	it("handles multiple variable substitutions", () => {
		const templates = {
			equals: "${attribute} = ${value}",
			like: "${attribute} LIKE ${value}",
		};
		const formatter = compileFormatter(templates, "operator", [
			"attribute",
			"value",
		]);

		expect(
			formatter({ operator: "equals", attribute: "name", value: "John" }),
		).toBe("name = John");
		expect(
			formatter({ operator: "like", attribute: "email", value: "%@test.com" }),
		).toBe("email LIKE %@test.com");
	});
});

describe("compileWhereFormatter", () => {
	it("creates formatter with expressionName pivot and attribute/value keys", () => {
		const templates = {
			$eq: "${attribute} = ${value}",
			$gt: "${attribute} > ${value}",
		};
		const formatter = compileWhereFormatter(templates);

		expect(
			formatter({ expressionName: "$eq", attribute: "age", value: "25" }),
		).toBe("age = 25");
		expect(
			formatter({ expressionName: "$gt", attribute: "score", value: "100" }),
		).toBe("score > 100");
	});
});

describe("compileOrderFormatter", () => {
	it("creates formatter with direction pivot and attribute key", () => {
		const templates = {
			asc: "ORDER BY ${attribute} ASC",
			desc: "ORDER BY ${attribute} DESC",
		};
		const formatter = compileOrderFormatter(templates);

		expect(formatter({ direction: "asc", attribute: "name" })).toBe(
			"ORDER BY name ASC",
		);
		expect(formatter({ direction: "desc", attribute: "created_at" })).toBe(
			"ORDER BY created_at DESC",
		);
	});
});

describe("compileResourceMappers", () => {
	const schema = {
		resources: {
			users: {
				attributes: {
					name: { type: "string" },
					email: { type: "string" },
					age: { type: "number" },
				},
				relationships: {
					posts: { type: "posts", cardinality: "many" },
				},
			},
		},
	};

	it("uses default mapping when no mapper provided", () => {
		const mapper = compileResourceMappers(schema, "users", {});
		const resource = { name: "John", email: "john@test.com", age: 30 };

		expect(mapper(resource)).toEqual({
			name: "John",
			email: "john@test.com",
			age: 30,
		});
	});

	it("applies string mappers", () => {
		const mappers = {
			name: "full_name",
			email: "email_address",
		};
		const mapper = compileResourceMappers(schema, "users", mappers);
		const resource = {
			full_name: "John Doe",
			email_address: "john@test.com",
			age: 30,
		};

		expect(mapper(resource)).toEqual({
			name: "John Doe",
			email: "john@test.com",
			age: 30,
		});
	});

	it("applies function mappers", () => {
		const mappers = {
			name: (res) => res.first_name + " " + res.last_name,
			age: (res) => parseInt(res.birth_year),
		};
		const mapper = compileResourceMappers(schema, "users", mappers);
		const resource = {
			first_name: "John",
			last_name: "Doe",
			email: "john@test.com",
			birth_year: "1990",
		};

		expect(mapper(resource)).toEqual({
			name: "John Doe",
			email: "john@test.com",
			age: 1990,
		});
	});

	it("excludes undefined values from result", () => {
		const mapper = compileResourceMappers(schema, "users", {});
		const resource = { name: "John", email: undefined };

		expect(mapper(resource)).toEqual({
			name: "John",
		});
	});

	it("throws error for invalid mapper type", () => {
		const mappers = { name: 123 };

		expect(() => compileResourceMappers(schema, "users", mappers)).toThrow(
			"mappers must be functions or strings",
		);
	});

	it("handles relationships", () => {
		const mappers = {
			posts: "post_ids",
		};
		const mapper = compileResourceMappers(schema, "users", mappers);
		const resource = {
			name: "John",
			email: "john@test.com",
			post_ids: ["1", "2", "3"],
		};

		expect(mapper(resource)).toEqual({
			name: "John",
			email: "john@test.com",
			posts: ["1", "2", "3"],
		});
	});
});

describe("buildAsyncMiddlewarePipe", () => {
	it("builds middleware pipeline in reverse order", async () => {
		const calls = [];

		const middleware1 = async (val, next) => {
			calls.push("mw1-before");
			const result = await next(val + "-mw1");
			calls.push("mw1-after");
			return result;
		};

		const middleware2 = async (val, next) => {
			calls.push("mw2-before");
			const result = await next(val + "-mw2");
			calls.push("mw2-after");
			return result;
		};

		const pipe = buildAsyncMiddlewarePipe([middleware1, middleware2]);
		const result = await pipe("start");

		expect(result).toBe("start-mw1-mw2");
		expect(calls).toEqual([
			"mw1-before",
			"mw2-before",
			"mw2-after",
			"mw1-after",
		]);
	});

	it("handles empty middleware array", async () => {
		const pipe = buildAsyncMiddlewarePipe([]);
		const result = await pipe("test");

		expect(result).toBe("test");
	});

	it("handles single middleware", async () => {
		const middleware = async (val, next) => {
			return await next(val + "-modified");
		};

		const pipe = buildAsyncMiddlewarePipe([middleware]);
		const result = await pipe("input");

		expect(result).toBe("input-modified");
	});

	it("allows middleware to transform the result", async () => {
		const middleware1 = async (val, next) => {
			const result = await next(val);
			return result.toUpperCase();
		};

		const middleware2 = async (val, next) => {
			return await next(val + "-suffix");
		};

		const pipe = buildAsyncMiddlewarePipe([middleware1, middleware2]);
		const result = await pipe("test");

		expect(result).toBe("TEST-SUFFIX");
	});
});
