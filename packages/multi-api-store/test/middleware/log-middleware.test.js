import { expect, it, describe, vi } from "vitest";
import { log } from "../../src/middleware/log-middleware.js";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import skepticismSchema from "../fixtures/skepticism.schema.json";

describe("log.requests middleware", () => {
	describe("in isolation", () => {
		it("should log successful requests with default console logger", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};
			const middleware = log.requests({ logger: mockLogger });
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
			const middleware = log.requests({ logger: mockLogger });
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

		it("should disable timing when includeTiming is false", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};
			const middleware = log.requests({
				logger: mockLogger,
				includeTiming: false,
			});
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await middleware(ctx, mockNext);

			expect(mockLogger.log).toHaveBeenCalledWith("→ test request started");
			expect(mockLogger.log).toHaveBeenCalledWith("✓ test completed");
		});

		it("should use console as default logger", async () => {
			const originalConsole = { ...console };
			console.log = vi.fn();
			console.error = vi.fn();

			const middleware = log.requests();
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
		it("logs successful skeptics query", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};

			const mockQuery = vi.fn().mockResolvedValue([
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
				middleware: [log.requests({ logger: mockLogger })],
				resources: {
					skeptics: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const result = await store.query({
				type: "skeptics",
				select: ["name", "specialty"],
			});

			expect(mockLogger.log).toHaveBeenCalledWith("→ skeptics request started");
			expect(mockLogger.log).toHaveBeenCalledWith(
				expect.stringMatching(/✓ skeptics completed \(\d+ms\)/),
			);
			expect(mockLogger.error).not.toHaveBeenCalled();

			expect(result).toEqual([
				{
					name: "James Randi",
					specialty: "Magic debunking",
				},
			]);
		});

		it("logs failed skeptics query", async () => {
			const mockLogger = {
				log: vi.fn(),
				error: vi.fn(),
			};

			const serverError = new Error("Internal Server Error");
			serverError.response = { status: 500, data: { message: "Server error" } };
			const mockQuery = vi.fn().mockRejectedValue(serverError);

			const config = {
				specialHandlers: [],
				middleware: [log.requests({ logger: mockLogger })],
				resources: {
					skeptics: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({
					type: "skeptics",
					select: ["name", "specialty"],
				}),
			).rejects.toThrow();

			expect(mockLogger.log).toHaveBeenCalledWith("→ skeptics request started");
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringMatching(
					/✗ skeptics failed \(\d+ms\): Internal Server Error/,
				),
			);
		});
	});
});
