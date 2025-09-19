import { describe, it, expect } from "vitest";
import {
	compileFormatter,
	compileWhereFormatter,
	compileOrderFormatter,
	buildAsyncMiddlewarePipe,
	handleFetchResponse,
	normalizeConfig,
} from "../src/helpers/helpers.js";

// TODO: decide if we're reviving this function
describe.skip("compileFormatter", () => {
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

// TODO: decide if we're reviving this function
describe.skip("compileWhereFormatter", () => {
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

// TODO: decide if we're reviving this function
describe.skip("compileOrderFormatter", () => {
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

describe("handleFetchResponse", () => {
	it("handles successful Response objects", async () => {
		const mockResponse = {
			ok: true,
			json: async () => ({ data: "test", id: 1 }),
		};

		const result = await handleFetchResponse(mockResponse);
		expect(result).toEqual({ data: "test", id: 1 });
	});

	it("handles failed Response objects with JSON error data", async () => {
		const mockResponse = {
			ok: false,
			status: 404,
			statusText: "Not Found",
			json: async () => ({ message: "Resource not found", code: "NOT_FOUND" }),
		};

		await expect(handleFetchResponse(mockResponse)).rejects.toThrow(
			"Resource not found",
		);

		try {
			await handleFetchResponse(mockResponse);
		} catch (error) {
			expect(error.cause.data).toEqual({
				message: "Resource not found",
				code: "NOT_FOUND",
			});
			expect(error.cause.originalError).toBe(mockResponse);
		}
	});

	it("handles failed Response objects with fallback to statusText", async () => {
		const mockResponse = {
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
			json: async () => {
				throw new Error("Failed to parse JSON");
			},
		};

		await expect(handleFetchResponse(mockResponse)).rejects.toThrow(
			"Internal Server Error",
		);

		try {
			await handleFetchResponse(mockResponse);
		} catch (error) {
			expect(error.cause.data).toEqual({ message: "Internal Server Error" });
			expect(error.cause.originalError).toBe(mockResponse);
		}
	});

	it("handles failed Response objects with empty error message", async () => {
		const mockResponse = {
			ok: false,
			status: 400,
			statusText: "Bad Request",
			json: async () => ({}), // Empty error object
		};

		await expect(handleFetchResponse(mockResponse)).rejects.toThrow("HTTP 400");
	});

	it("falls back to HTTP status when statusText is empty", async () => {
		const mockResponse = {
			ok: false,
			status: 502,
			statusText: "", // Empty statusText
			json: async () => {
				throw new Error("Failed to parse JSON");
			},
		};

		await expect(handleFetchResponse(mockResponse)).rejects.toThrow("HTTP 502");
	});

	it("handles non-Response objects (direct data)", async () => {
		const directData = { name: "John", age: 30 };
		const result = await handleFetchResponse(directData);
		expect(result).toBe(directData);
	});

	it("handles null responses", async () => {
		const result = await handleFetchResponse(null);
		expect(result).toBe(null);
	});

	it("handles undefined responses", async () => {
		const result = await handleFetchResponse(undefined);
		expect(result).toBe(undefined);
	});

	it("handles primitive responses", async () => {
		expect(await handleFetchResponse("string")).toBe("string");
		expect(await handleFetchResponse(42)).toBe(42);
		expect(await handleFetchResponse(true)).toBe(true);
	});

	it("preserves error cause structure", async () => {
		const mockResponse = {
			ok: false,
			status: 403,
			statusText: "Forbidden",
			json: async () => ({
				message: "Access denied",
				details: "Insufficient permissions",
			}),
		};

		try {
			await handleFetchResponse(mockResponse);
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error.message).toBe("Access denied");
			expect(error.cause).toHaveProperty("data");
			expect(error.cause).toHaveProperty("originalError");
			expect(error.cause.data.details).toBe("Insufficient permissions");
			expect(error.cause.originalError).toBe(mockResponse);
		}
	});
});

describe("normalizeConfig", () => {
	const mockSchema = {
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

	describe("store-level configuration", () => {
		it("passes through non-operation properties unchanged", () => {
			const config = {
				cache: { enabled: true },
				middleware: [],
				specialHandlers: [],
				someOtherProperty: "test",
			};

			const result = normalizeConfig(config);

			expect(result.cache).toEqual({ enabled: true });
			expect(result.middleware).toEqual([]);
			expect(result.specialHandlers).toEqual([]);
			expect(result.someOtherProperty).toBe("test");
		});

		it("handles empty config", () => {
			const result = normalizeConfig({});
			expect(result).toEqual({});
		});

		it("handles config with no operations", () => {
			const config = {
				cache: { enabled: true },
				baseURL: "https://api.example.com",
			};

			const result = normalizeConfig(config);
			expect(result).toEqual(config);
		});
	});

	describe("resource-level configuration", () => {
		it("handles function shorthand", () => {
			const mockFn = () => {};
			const result = normalizeConfig({ query: mockFn }, "users", mockSchema);

			expect(result).toEqual({
				query: { fetch: mockFn },
			});
		});

		it("handles operation function shorthand", () => {
			const mockFn = () => {};
			const config = { query: mockFn, create: mockFn };
			const result = normalizeConfig(config, "users", mockSchema);

			expect(result).toEqual({
				query: { fetch: mockFn },
				create: { fetch: mockFn },
			});
		});

		it("handles full format unchanged when no mappers", () => {
			const mockFn = () => {};
			const config = {
				query: { fetch: mockFn, someOtherProp: "test" },
				create: { fetch: mockFn },
				nonOperation: "preserved",
			};
			const result = normalizeConfig(config, "users", mockSchema);

			expect(result).toEqual({
				query: { fetch: mockFn, someOtherProp: "test" },
				create: { fetch: mockFn },
				nonOperation: "preserved",
			});
		});

		it("compiles mappers when provided", () => {
			const mockFn = () => {};
			const config = {
				query: {
					fetch: mockFn,
					mappers: {
						name: "full_name",
						age: (res) => parseInt(res.birth_year),
					},
				},
			};
			const result = normalizeConfig(config, "users", mockSchema);

			expect(result.query.fetch).toBe(mockFn);
			expect(typeof result.query.map).toBe("function");
			expect(result.query.mappers).toBeUndefined(); // Should be removed after compilation
		});

		it("preserves existing map function over mappers", () => {
			const mockFn = () => {};
			const existingMapFn = () => ({ mapped: true });
			const config = {
				query: {
					fetch: mockFn,
					map: existingMapFn,
					mappers: {
						name: "full_name",
					},
				},
			};
			const result = normalizeConfig(config, "users", mockSchema);

			expect(result.query.fetch).toBe(mockFn);
			expect(result.query.map).toBe(existingMapFn);
			expect(result.query.mappers).toBeUndefined(); // Should be removed after compilation
		});

		it("skips mapper compilation when no type provided", () => {
			const mockFn = () => {};
			const config = {
				query: {
					fetch: mockFn,
					mappers: {
						name: "full_name",
					},
				},
			};
			const result = normalizeConfig(config);

			expect(result.query.fetch).toBe(mockFn);
			expect(result.query.mappers).toBeUndefined(); // Mappers are always deleted by compileOpMappers
			expect(result.query.map).toBeUndefined();
		});

		it("skips mapper compilation when no schema provided", () => {
			const mockFn = () => {};
			const config = {
				query: {
					fetch: mockFn,
					mappers: {
						name: "full_name",
					},
				},
			};
			const result = normalizeConfig(config, "users", undefined);

			expect(result.query.fetch).toBe(mockFn);
			expect(result.query.mappers).toBeUndefined(); // Mappers are always deleted by compileOpMappers
			expect(result.query.map).toBeUndefined();
		});

		it("handles multiple operations with mixed configurations", () => {
			const queryFn = () => {};
			const createFn = () => {};
			const updateFn = () => {};
			const config = {
				query: {
					fetch: queryFn,
					mappers: { name: "full_name" },
				},
				create: createFn, // Function shorthand
				update: { fetch: updateFn }, // Object without mappers
				nonOperation: "preserved",
			};
			const result = normalizeConfig(config, "users", mockSchema);

			expect(result.query.fetch).toBe(queryFn);
			expect(typeof result.query.map).toBe("function");
			expect(result.create.fetch).toBe(createFn);
			expect(result.update.fetch).toBe(updateFn);
			expect(result.nonOperation).toBe("preserved");
		});

		it("works with compiled mappers", () => {
			const mockFn = () => {};
			const config = {
				query: {
					fetch: mockFn,
					mappers: {
						name: "moniker",
						age: (res) => Math.round(res.decadesActive / 10),
					},
				},
			};
			const result = normalizeConfig(config, "users", mockSchema);

			// Test the compiled mapper function
			const mapper = result.query.map;
			const testResource = {
				moniker: "John Doe",
				email: "john@example.com",
				decadesActive: 25,
			};

			const mapped = mapper(testResource);
			expect(mapped.name).toBe("John Doe");
			expect(mapped.email).toBe("john@example.com");
			expect(mapped.age).toBe(3); // Math.round(25 / 10)
		});

		describe("compileResourceMappers behavior", () => {
			it("uses default mapping when no mapper provided", () => {
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers: {},
					},
				};
				const result = normalizeConfig(config, "users", mockSchema);
				const mapper = result.query.map;
				const resource = { name: "John", email: "john@test.com", age: 30 };

				expect(mapper(resource)).toEqual({
					name: "John",
					email: "john@test.com",
					age: 30,
				});
			});

			it("applies string mappers", () => {
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers: {
							name: "full_name",
							email: "email_address",
						},
					},
				};
				const result = normalizeConfig(config, "users", mockSchema);
				const mapper = result.query.map;
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
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers: {
							name: (res) => res.first_name + " " + res.last_name,
							age: (res) => parseInt(res.birth_year),
						},
					},
				};
				const result = normalizeConfig(config, "users", mockSchema);
				const mapper = result.query.map;
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
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers: {},
					},
				};
				const result = normalizeConfig(config, "users", mockSchema);
				const mapper = result.query.map;
				const resource = { name: "John", email: undefined };

				expect(mapper(resource)).toEqual({
					name: "John",
				});
			});

			it("throws error for invalid mapper type", () => {
				const mappers = { name: 123 };
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers,
					},
				};

				expect(() => normalizeConfig(config, "users", mockSchema)).toThrow(
					"mappers must be functions or strings",
				);
			});

			it("handles relationships", () => {
				const mockFn = () => {};
				const config = {
					query: {
						fetch: mockFn,
						mappers: {
							posts: "post_ids",
						},
					},
				};
				const result = normalizeConfig(config, "users", mockSchema);
				const mapper = result.query.map;
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
	});
});
