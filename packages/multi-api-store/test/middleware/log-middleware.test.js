import { expect, it, describe, vi } from "vitest";
import { log } from "../../src/middleware/log-middleware.js";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import utahParksSchema from "../fixtures/utah-parks.schema.json";

describe("log.simple middleware", () => {
	describe("in isolation", () => {
		it("should log successful requests with default console logger", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};
			const middleware = log.simple({ logger: mockLogger });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			const result = await middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledTimes(1);
			expect(result).toBe("success");
			expect(mockLogger.log).toHaveBeenCalledWith("→ test request started");
			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.stringMatching(/✓ test completed \(\d+ms\)/),
			);
			expect(mockLogger.error).not.toHaveBeenCalled();
		});

		it("should log failed requests with error details", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};
			const middleware = log.simple({ logger: mockLogger });
			const testError = new Error("Request failed");
			const mockNext = vi.fn().mockRejectedValue(testError);
			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await expect(middleware(ctx, mockNext)).rejects.toThrow("Request failed");

			expect(mockLogger.log).toHaveBeenCalledWith("→ test request started");
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringMatching(/✗ test failed \(\d+ms\): Request failed/),
			);
		});

		it("should use console as default logger", async () => {
			const originalConsole = { ...console };
			console.log = vi.fn();
			console.error = vi.fn();

			const middleware = log.simple();
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await middleware(ctx, mockNext);

			expect(console.log).toHaveBeenCalledWith("→ test request started");
			expect(console.log).toHaveBeenCalledWith(
				expect.stringMatching(/✓ test completed \(\d+ms\)/),
			);

			// Restore console
			Object.assign(console, originalConsole);
		});
	});

	describe("in examples", () => {
		it("logs successful parks query", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};

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
				middleware: [log.simple({ logger: mockLogger })],
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

			expect(mockLogger.log).toHaveBeenCalledWith("→ parks request started");
			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.stringMatching(/✓ parks completed \(\d+ms\)/),
			);
			expect(mockLogger.error).not.toHaveBeenCalled();

			expect(result).toEqual([
				{
					name: "Zion National Park",
					location: "Utah",
				},
			]);
		});

		it("logs failed parks query", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};

			const serverError = new Error("Internal Server Error");
			serverError.response = { status: 500, data: { message: "Server error" } };
			const mockQuery = vi.fn().mockRejectedValue(serverError);

			const config = {
				specialHandlers: [],
				middleware: [log.simple({ logger: mockLogger })],
				resources: {
					parks: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			await expect(
				store.query({
					type: "parks",
					select: ["name", "location"],
				}),
			).rejects.toThrow();

			expect(mockLogger.log).toHaveBeenCalledWith("→ parks request started");
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringMatching(
					/✗ parks failed \(\d+ms\): Internal Server Error/,
				),
			);
		});
	});
});

describe("log.monitor middleware", () => {
	describe("in isolation", () => {
		it("should collect timing and cache info", async () => {
			const hooks = [];
			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue({
				data: "success",
				meta: { cacheHit: true },
			});
			const ctx = {
				query: { type: "test" },
			};

			const result = await middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledTimes(1);
			expect(result).toEqual({
				data: "success",
				meta: { cacheHit: true },
			});
		});

		it("should execute hooks that pass test condition", async () => {
			const testHook = vi.fn().mockReturnValue(true);
			const actionHook = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(testHook).toHaveBeenCalledWith("success", ctx, {
				duration: expect.any(Number),
				cacheHit: false,
			});
			expect(actionHook).toHaveBeenCalledWith("success", ctx, {
				duration: expect.any(Number),
				cacheHit: false,
			});
		});

		it("should skip hooks that fail test condition", async () => {
			const testHook = vi.fn().mockReturnValue(false);
			const actionHook = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(testHook).toHaveBeenCalled();
			expect(actionHook).not.toHaveBeenCalled();
		});

		it("should include error info when request fails", async () => {
			const testHook = vi.fn().mockReturnValue(true);
			const actionHook = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks });
			const testError = new Error("Request failed");
			const mockNext = vi.fn().mockRejectedValue(testError);
			const ctx = { query: { type: "test" } };

			await expect(middleware(ctx, mockNext)).rejects.toThrow("Request failed");

			expect(testHook).toHaveBeenCalledWith(undefined, ctx, {
				duration: expect.any(Number),
				cacheHit: false,
				error: testError,
			});
		});

		it("should detect cache hits from result metadata", async () => {
			const testHook = vi.fn().mockReturnValue(true);
			const actionHook = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue({
				data: "cached data",
				meta: { cacheHit: true },
			});
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(testHook).toHaveBeenCalledWith(
				{ data: "cached data", meta: { cacheHit: true } },
				ctx,
				{
					duration: expect.any(Number),
					cacheHit: true,
				},
			);
		});

		it("should handle hook test errors with onError callback", async () => {
			const testError = new Error("Test failed");
			const testHook = vi.fn().mockImplementation(() => {
				throw testError;
			});
			const actionHook = vi.fn();
			const onError = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks, onError });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(onError).toHaveBeenCalledWith(testError, {
				test: testHook,
				action: actionHook,
			});
			expect(actionHook).not.toHaveBeenCalled();
		});

		it("should handle hook action errors with onError callback", async () => {
			const actionError = new Error("Action failed");
			const testHook = vi.fn().mockReturnValue(true);
			const actionHook = vi.fn().mockImplementation(() => {
				throw actionError;
			});
			const onError = vi.fn();
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks, onError });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(onError).toHaveBeenCalledWith(actionError, {
				test: testHook,
				action: actionHook,
			});
		});

		it("should throw hook errors when no onError handler provided", async () => {
			const actionError = new Error("Action failed");
			const testHook = vi.fn().mockReturnValue(true);
			const actionHook = vi.fn().mockImplementation(() => {
				throw actionError;
			});
			const hooks = [{ test: testHook, action: actionHook }];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = { query: { type: "test" } };

			await expect(middleware(ctx, mockNext)).rejects.toThrow("Action failed");
		});
	});

	describe("practical examples", () => {
		it("should monitor slow queries", async () => {
			const slowQueryAlert = vi.fn();
			const hooks = [
				{
					test: (result, ctx, info) => info.duration > 100,
					action: slowQueryAlert,
				},
			];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 150));
				return "success";
			});
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(slowQueryAlert).toHaveBeenCalledWith("success", ctx, {
				duration: expect.any(Number),
				cacheHit: false,
			});
		});

		it("should monitor cache performance", async () => {
			const cacheMetrics = vi.fn();
			const hooks = [
				{
					test: (result, ctx, info) => info.cacheHit,
					action: cacheMetrics,
				},
			];

			const middleware = log.monitor({ hooks });
			const mockNext = vi.fn().mockResolvedValue({
				data: "cached",
				meta: { cacheHit: true },
			});
			const ctx = { query: { type: "test" } };

			await middleware(ctx, mockNext);

			expect(cacheMetrics).toHaveBeenCalledWith(
				{ data: "cached", meta: { cacheHit: true } },
				ctx,
				{
					duration: expect.any(Number),
					cacheHit: true,
				},
			);
		});

		it("should monitor errors", async () => {
			const errorTracker = vi.fn();
			const hooks = [
				{
					test: (result, ctx, info) => !!info.error,
					action: errorTracker,
				},
			];

			const middleware = log.monitor({ hooks });
			const testError = new Error("API failed");
			const mockNext = vi.fn().mockRejectedValue(testError);
			const ctx = { query: { type: "test" } };

			await expect(middleware(ctx, mockNext)).rejects.toThrow("API failed");

			expect(errorTracker).toHaveBeenCalledWith(undefined, ctx, {
				duration: expect.any(Number),
				cacheHit: false,
				error: testError,
			});
		});
	});
});
