import { expect, it, describe, vi } from "vitest";
import { retry } from "../../src/middleware/retry-middleware.js";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import skepticismSchema from "../fixtures/skepticism.schema.json";

describe("retry.exponential middleware", () => {
	const backoffFn = () => 1;

	describe("in isolation", () => {
		it("should succeed on first try when no error occurs", async () => {
			const middleware = retry.exponential();
			const mockNext = vi.fn().mockResolvedValue("success");
			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			const result = await middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledTimes(1);
			expect(mockNext).toHaveBeenCalledWith(ctx);
			expect(result).toBe("success");
		});

		it("should retry on 5xx HTTP errors", async () => {
			const middleware = retry.exponential({ backoffFn });
			const serverError = new Error("Internal Server Error", {
				cause: { response: { status: 500 }, data: { message: "Server error" } },
			});

			const mockNext = vi
				.fn()
				.mockRejectedValueOnce(serverError)
				.mockResolvedValueOnce("success after retry");

			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			const result = await middleware(ctx, mockNext);

			expect(mockNext).toHaveBeenCalledTimes(2);
			expect(result).toBe("success after retry");
		});

		it("should not retry on 4xx HTTP errors", async () => {
			const middleware = retry.exponential();
			const clientError = new Error("Bad Request", {
				cause: { response: { status: 400 }, data: { message: "Bad request" } },
			});

			const mockNext = vi.fn().mockRejectedValue(clientError);

			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await expect(middleware(ctx, mockNext)).rejects.toThrow("Bad Request");
			expect(mockNext).toHaveBeenCalledTimes(1);
		});

		it("should give up on requests that hang", async () => {
			const middleware = retry.exponential({
				backoffFn,
				timeout: 1,
			});

			const makeNetworkHang = () =>
				new Promise((resolve) => {
					setTimeout(() => {
						resolve("waited 300 ms");
					}, 3000);
				});

			const mockNext = vi.fn().mockImplementation(makeNetworkHang);

			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await expect(middleware(ctx, mockNext)).rejects.toThrow(
				"request timed out after 0 second(s)",
			);
			expect(mockNext).toHaveBeenCalledTimes(4);
		});

		it("should not retry on non-HTTP/network errors", async () => {
			const middleware = retry.exponential({ backoffFn });
			const genericError = new Error("Some other error");

			const mockNext = vi.fn().mockRejectedValue(genericError);

			const ctx = {
				query: { type: "test" },
				request: { headers: {} },
			};

			await expect(middleware(ctx, mockNext)).rejects.toThrow(
				"Some other error",
			);
			expect(mockNext).toHaveBeenCalledTimes(1);
		});
	});

	describe("in examples", () => {
		it("retries failed skeptics query and eventually succeeds", async () => {
			const gatewayTimeout = new Error("Gateway Timeout", {
				cause: {
					response: { status: 504 },
					data: { message: "Upstream timeout" },
				},
			});

			const mockQuery = vi
				.fn()
				.mockRejectedValueOnce(gatewayTimeout)
				.mockRejectedValueOnce(gatewayTimeout)
				.mockResolvedValueOnce([
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
				middleware: [retry.exponential({ backoffFn })],
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

			expect(mockQuery).toHaveBeenCalledTimes(3);
			expect(result).toEqual([
				{
					name: "James Randi",
					specialty: "Magic debunking",
				},
			]);
		});

		it("gives up on persistent server errors after max retries", async () => {
			const serverError = new Error("Internal Server Error", {
				cause: {
					response: { status: 500 },
					data: { message: "Database down" },
				},
			});

			const mockQuery = vi.fn().mockRejectedValue(serverError);

			const config = {
				specialHandlers: [],
				middleware: [retry.exponential({ backoffFn })],
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

			expect(mockQuery).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
		});
	});
});
