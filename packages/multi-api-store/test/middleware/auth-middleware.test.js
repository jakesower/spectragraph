import { expect, it, describe, vi } from "vitest";
import { auth } from "../../src/middleware/auth-middleware.js";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import skepticismSchema from "../fixtures/skepticism.schema.json";

describe("auth.bearerToken middleware", () => {
	describe("in isolation", () => {
		it("should add Bearer token to Authorization header", () => {
			const mockGetToken = vi.fn().mockReturnValue("test-token-123");
			const middleware = auth.bearerToken(mockGetToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					headers: { "Content-Type": "application/json" },
				},
			};

			middleware(ctx, mockNext);

			expect(mockGetToken).toHaveBeenCalledOnce();
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
			const mockGetToken = vi.fn().mockReturnValue("new-token");
			const middleware = auth.bearerToken(mockGetToken);

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
			const mockGetToken = vi.fn().mockImplementation(() => {
				throw new Error("Token retrieval failed");
			});
			const middleware = auth.bearerToken(mockGetToken);

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
		it("queries skeptics with auth token", async () => {
			const mockGet = vi.fn().mockResolvedValue([
				{
					id: "1",
					name: "James Randi",
					specialty: "Magic debunking",
					yearsActive: 50,
					famousQuote: "No amount of belief makes something a fact.",
				},
			]);

			const config = {
				specialHandlers: [],
				middleware: [auth.bearerToken(() => "ralphie voice: I'm a middleware")],
				resources: {
					skeptics: {
						handlers: {
							get: {
								fetch: mockGet,
							},
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const result = await store.query({
				type: "skeptics",
				select: ["name", "specialty"],
			});

			// Verify the Authorization header was added by the middleware
			expect(mockGet).toHaveBeenCalledWith(
				expect.objectContaining({
					request: expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "Bearer ralphie voice: I'm a middleware",
						}),
					}),
				}),
			);

			expect(result).toEqual([
				{
					name: "James Randi",
					specialty: "Magic debunking",
				},
			]);
		});
	});
});

describe("auth.queryParam middleware", () => {
	describe("in isolation", () => {
		it("should add token to queryParams with default param name", () => {
			const mockGetToken = vi.fn().mockReturnValue("test-token-123");
			const middleware = auth.queryParam(mockGetToken);

			const mockNext = vi.fn();
			const ctx = {
				query: { type: "test" },
				request: {
					queryParams: [{ existing: "param" }],
				},
			};

			middleware(ctx, mockNext);

			expect(mockGetToken).toHaveBeenCalledOnce();
			expect(mockNext).toHaveBeenCalledWith({
				...ctx,
				request: {
					queryParams: [{ existing: "param" }, { token: "test-token-123" }],
				},
			});
		});

		it("should add token to queryParams with custom param name", () => {
			const mockGetToken = vi.fn().mockReturnValue("custom-token-456");
			const middleware = auth.queryParam(mockGetToken, "api_key");

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
			const mockGetToken = vi.fn().mockImplementation(() => {
				throw new Error("Token retrieval failed");
			});
			const middleware = auth.queryParam(mockGetToken);

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
		it("queries skeptics with auth query param", async () => {
			const mockGet = vi.fn().mockResolvedValue([
				{
					id: "1",
					name: "James Randi",
					specialty: "Magic debunking",
					yearsActive: 50,
					famousQuote: "No amount of belief makes something a fact.",
				},
			]);

			const config = {
				specialHandlers: [],
				middleware: [auth.queryParam(() => "secret-api-key", "access_token")],
				resources: {
					skeptics: {
						handlers: {
							get: {
								fetch: mockGet,
							},
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const result = await store.query({
				type: "skeptics",
				select: ["name", "specialty"],
			});

			expect(mockGet).toHaveBeenCalledWith(
				expect.objectContaining({
					request: expect.objectContaining({
						queryParamsStr: "?access_token=secret-api-key",
					}),
				}),
			);

			expect(result).toEqual([
				{
					name: "James Randi",
					specialty: "Magic debunking",
				},
			]);
		});
	});
});
