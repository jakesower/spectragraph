import { expect, it, describe, vi } from "vitest";
import { auth } from "../../src/middleware/auth-middleware.js";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import utahParksSchema from "../fixtures/utah-parks.schema.json";

describe("auth.bearerToken middleware", () => {
	describe("in isolation", () => {
		it("should add Bearer token to Authorization header", () => {
			const mockQueryToken = vi.fn().mockReturnValue("test-token-123");
			const middleware = auth.bearerToken(mockQueryToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					headers: { "Content-Type": "application/json" },
				},
			};

			middleware(ctx, mockNext);

			expect(mockQueryToken).toHaveBeenCalledOnce();
			expect(mockNext).toHaveBeenCalledWith({
				...ctx,
				request: {
					headers: {
						...ctx.request.headers,
						Authorization: "Bearer test-token-123",
					},
				},
			});
		});

		it("should overwrite existing Authorization header", () => {
			const mockQueryToken = vi.fn().mockReturnValue("new-token");
			const middleware = auth.bearerToken(mockQueryToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					headers: {
						Authorization: "Bearer old-token",
						"Content-Type": "application/json",
					},
				},
			};

			middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledWith({
				...ctx,
				request: {
					headers: {
						...ctx.request.headers,
						Authorization: "Bearer new-token",
					},
				},
			});
		});

		it("should handle getToken function that throws", () => {
			const mockQueryToken = vi.fn().mockImplementation(() => {
				throw new Error("Token retrieval failed");
			});
			const middleware = auth.bearerToken(mockQueryToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					headers: {},
				},
			};

			expect(() => middleware(ctx, mockNext)).toThrow("Token retrieval failed");
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe("in examples", () => {
		it("queries parks with auth token", async () => {
			const mockQuery = vi.fn().mockResolvedValue([
				{
					id: "zion",
					name: "Zion National Park",
					location: "Utah",
					established: 1919,
					bestSeason: "spring",
				},
			]);

			const config = {
				specialHandlers: [],
				middleware: [auth.bearerToken(() => "test-nps-api-key")],
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", "location"],
			});

			// Verify the Authorization header was added by the middleware
			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					request: expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "Bearer test-nps-api-key",
						}),
					}),
				}),
			);

			expect(result).toEqual([
				{
					name: "Zion National Park",
					location: "Utah",
				},
			]);
		});
	});
});

describe("auth.queryParam middleware", () => {
	describe("in isolation", () => {
		it("should add token to queryParams with default param name", () => {
			const mockQueryToken = vi.fn().mockReturnValue("test-token-123");
			const middleware = auth.queryParam(mockQueryToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					queryParams: [{ existing: "param" }],
				},
			};

			middleware(ctx, mockNext);

			expect(mockQueryToken).toHaveBeenCalledOnce();
			expect(mockNext).toHaveBeenCalledWith({
				...ctx,
				request: {
					queryParams: [{ existing: "param" }, { token: "test-token-123" }],
				},
			});
		});

		it("should add token to queryParams with custom param name", () => {
			const mockQueryToken = vi.fn().mockReturnValue("custom-token-456");
			const middleware = auth.queryParam(mockQueryToken, "api_key");

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					queryParams: [],
				},
			};

			middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledWith({
				...ctx,
				request: {
					queryParams: [{ api_key: "custom-token-456" }],
				},
			});
		});

		it("should handle getToken function that throws", () => {
			const mockQueryToken = vi.fn().mockImplementation(() => {
				throw new Error("Token retrieval failed");
			});
			const middleware = auth.queryParam(mockQueryToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					queryParams: [],
				},
			};

			expect(() => middleware(ctx, mockNext)).toThrow("Token retrieval failed");
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe("in examples", () => {
		it("queries parks with auth query param", async () => {
			const mockQuery = vi.fn().mockResolvedValue([
				{
					id: "zion",
					name: "Zion National Park",
					location: "Utah",
					established: 1919,
					bestSeason: "spring",
				},
			]);

			const config = {
				specialHandlers: [],
				middleware: [auth.queryParam(() => "secret-nps-key", "api_key")],
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", "location"],
			});

			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					request: expect.objectContaining({
						queryParamsStr: "?api_key=secret-nps-key",
					}),
				}),
			);

			expect(result).toEqual([
				{
					name: "Zion National Park",
					location: "Utah",
				},
			]);
		});
	});
});
