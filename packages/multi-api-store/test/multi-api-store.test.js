import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";

describe("createMultiApiStore", () => {
	it("supports forceRefresh to clear cache and fetch fresh data", async () => {
		const mockQuery = vi
			.fn()
			.mockResolvedValueOnce([{ id: "1", name: "First Call" }])
			.mockResolvedValueOnce([{ id: "1", name: "Second Call" }]);

		const config = {
			cache: { enabled: true, defaultTTL: 60000 },
			resources: {
				skeptics: { query: { fetch: mockQuery } },
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		// Call 1: Normal caching
		const result1 = await store.query({ type: "skeptics", select: ["name"] });

		// Call 2: Should use cache (normal behavior)
		const result2 = await store.query({ type: "skeptics", select: ["name"] });

		// Call 3: With forceRefresh, should clear cache and fetch fresh
		const result3 = await store.query(
			{ type: "skeptics", select: ["name"] },
			{ forceRefresh: true },
		);

		// Call 4: Should now use the refreshed cache
		const result4 = await store.query({ type: "skeptics", select: ["name"] });

		expect(mockQuery).toHaveBeenCalledTimes(2); // Call 1 + call 3 (force refresh)
		expect(result1[0].name).toBe("First Call");
		expect(result2[0].name).toBe("First Call"); // Cached from call 1
		expect(result3[0].name).toBe("Second Call"); // Fresh fetch due to force refresh
		expect(result4[0].name).toBe("Second Call"); // Uses refreshed cache
	});

	it("queries skeptics with mocked get handler", async () => {
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

		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				query: {
					type: "skeptics",
					select: { name: "name", specialty: "specialty" },
				},
				schema: skepticismSchema,
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				specialty: "Magic debunking",
			},
		]);
	});

	it("queries skeptics with mappers", async () => {
		const mockQuery = vi.fn().mockResolvedValue([
			{
				id: "1",
				moniker: "James Randi",
				specialty: "Magic debunking",
				decadesActive: 5,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const config = {
			specialHandlers: [],
			resources: {
				skeptics: {
					query: {
						fetch: mockQuery,
						mappers: {
							name: "moniker",
							yearsActive: (res) => Math.round(res.decadesActive / 10),
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

		expect(mockQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				query: {
					type: "skeptics",
					select: { name: "name", specialty: "specialty" },
				},
				schema: skepticismSchema,
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				specialty: "Magic debunking",
			},
		]);
	});

	it("queries skeptics with related investigations", async () => {
		const mockSkepticsGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const mockInvestigationsGet = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Testing Uri Geller's Spoon Bending",
				claimTested: "Psychokinetic metal bending",
				methodsUsed: ["Controlled environment", "Video recording"],
				conclusion: "No paranormal activity detected",
				publicationYear: 1973,
				investigator: "1",
			},
		]);

		const config = {
			specialHandlers: [],
			resources: {
				skeptics: {
					query: {
						fetch: mockSkepticsGet,
					},
				},
				investigations: {
					query: {
						fetch: mockInvestigationsGet,
					},
				},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", { investigations: { select: ["title", "conclusion"] } }],
		});

		expect(mockSkepticsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				query: {
					type: "skeptics",
					select: { name: "name", investigations: expect.any(Object) },
				},
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				parentQuery: expect.any(Object),
				query: {
					type: "investigations",
					select: { title: "title", conclusion: "conclusion" },
				},
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				investigations: [
					{
						title: "Testing Uri Geller's Spoon Bending",
						conclusion: "No paranormal activity detected",
					},
				],
			},
		]);
	});

	it("queries skeptics with related investigations with a configured relationship field", async () => {
		const mockSkepticsGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const mockInvestigationsGet = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Testing Uri Geller's Spoon Bending",
				claimTested: "Psychokinetic metal bending",
				methodsUsed: ["Controlled environment", "Video recording"],
				conclusion: "No paranormal activity detected",
				publicationYear: 1973,
				investigator_id: "1",
			},
		]);

		const config = {
			specialHandlers: [],
			resources: {
				skeptics: {
					query: {
						fetch: mockSkepticsGet,
					},
				},
				investigations: {
					query: {
						fetch: mockInvestigationsGet,
						mappers: {
							investigator: "investigator_id",
						},
					},
				},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", { investigations: { select: ["title", "conclusion"] } }],
		});

		expect(mockSkepticsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				query: {
					type: "skeptics",
					select: { name: "name", investigations: expect.any(Object) },
				},
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				parentQuery: expect.any(Object),
				query: {
					type: "investigations",
					select: { title: "title", conclusion: "conclusion" },
				},
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				investigations: [
					{
						title: "Testing Uri Geller's Spoon Bending",
						conclusion: "No paranormal activity detected",
					},
				],
			},
		]);
	});

	it("uses special handlers to customize data loading", async () => {
		const mockSkepticsGet = vi.fn().mockResolvedValue([
			{
				id: "1",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			},
		]);

		const mockInvestigationsGet = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Standard Investigation",
				conclusion: "From general endpoint",
				investigator: "1",
			},
		]);

		const mockSpecialInvestigationsHandler = vi.fn().mockResolvedValue([
			{
				id: "inv1",
				title: "Special Investigation from Skeptics Endpoint",
				conclusion: "From specialized skeptics-investigations endpoint",
				investigator: "1",
			},
		]);

		const config = {
			specialHandlers: [
				{
					test: (query, context) =>
						query.type === "investigations" &&
						context.parentQuery?.type === "skeptics",
					handler: mockSpecialInvestigationsHandler,
				},
			],
			resources: {
				skeptics: {
					query: {
						fetch: mockSkepticsGet,
					},
				},
				investigations: {
					query: {
						fetch: mockInvestigationsGet,
					},
				},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", { investigations: { select: ["title", "conclusion"] } }],
		});

		// Should use special handler, not regular investigations get
		expect(mockInvestigationsGet).not.toHaveBeenCalled();
		expect(mockSpecialInvestigationsHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				parentQuery: expect.objectContaining({ type: "skeptics" }),
				query: {
					type: "investigations",
					select: { title: "title", conclusion: "conclusion" },
				},
			}),
		);

		expect(result).toEqual([
			{
				name: "James Randi",
				investigations: [
					{
						title: "Special Investigation from Skeptics Endpoint",
						conclusion: "From specialized skeptics-investigations endpoint",
					},
				],
			},
		]);
	});

	describe("CUD Operations", () => {
		it("creates a resource when create handler is available", async () => {
			const mockCreate = vi.fn().mockResolvedValue({
				id: "new-skeptic",
				name: "New Skeptic",
				specialty: "Critical Thinking",
				yearsActive: 1,
			});

			const config = {
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn(),
						},
						create: {
							fetch: mockCreate,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const newSkeptic = {
				type: "skeptics",
				attributes: {
					name: "New Skeptic",
					specialty: "Critical Thinking",
					yearsActive: 1,
				},
			};

			const result = await store.create(newSkeptic);

			expect(mockCreate).toHaveBeenCalledWith(
				newSkeptic,
				expect.objectContaining({
					schema: skepticismSchema,
				}),
			);
			expect(result).toEqual({
				id: "new-skeptic",
				name: "New Skeptic",
				specialty: "Critical Thinking",
				yearsActive: 1,
			});
		});

		it("throws error when no baseURL provided for standard handler", async () => {
			const config = {
				// No baseURL
				resources: {
					skeptics: {
						query: vi.fn(),
						// no create handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const newSkeptic = {
				type: "skeptics",
				attributes: { name: "New Skeptic" },
			};

			await expect(store.create(newSkeptic)).rejects.toThrow(
				"Failed to parse URL from undefined/skeptics",
			);
		});

		it("updates a resource when update handler is available", async () => {
			const mockUpdate = vi.fn().mockResolvedValue({
				id: "1",
				name: "Updated Skeptic",
				specialty: "Updated Specialty",
				yearsActive: 25,
			});

			const config = {
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn(),
						},
						update: {
							fetch: mockUpdate,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const updateSkeptic = {
				type: "skeptics",
				id: "1",
				attributes: {
					name: "Updated Skeptic",
					specialty: "Updated Specialty",
				},
			};

			const result = await store.update(updateSkeptic);

			expect(mockUpdate).toHaveBeenCalledWith(
				updateSkeptic,
				expect.objectContaining({
					schema: skepticismSchema,
				}),
			);
			expect(result).toEqual({
				id: "1",
				name: "Updated Skeptic",
				specialty: "Updated Specialty",
				yearsActive: 25,
			});
		});

		it("deletes a resource when delete handler is available", async () => {
			const mockDelete = vi.fn().mockResolvedValue({
				type: "skeptics",
				id: "1",
			});

			const config = {
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn(),
						},
						delete: {
							fetch: mockDelete,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const deleteSkeptic = {
				type: "skeptics",
				id: "1",
			};

			const result = await store.delete(deleteSkeptic);

			expect(mockDelete).toHaveBeenCalledWith(
				deleteSkeptic,
				expect.objectContaining({
					schema: skepticismSchema,
				}),
			);
			expect(result).toEqual({
				type: "skeptics",
				id: "1",
			});
		});

		it.skip("validates resource before creation", async () => {
			// Skip for now - the schema doesn't have required attributes configured
			// to test validation failures. This would need a more complex schema setup.
		});
	});

	describe("Caching", () => {
		it("caches query results when caching is enabled", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValueOnce([{ id: "1", name: "James Randi" }])
				.mockResolvedValueOnce([{ id: "2", name: "Different Data" }]);

			const config = {
				cache: {
					enabled: true,
					defaultTTL: 1000, // 1 second
				},
				resources: {
					skeptics: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const query = {
				type: "skeptics",
				select: ["name"],
			};

			// First call should hit the API
			const result1 = await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);
			expect(result1).toEqual([{ name: "James Randi" }]);

			// Second call should use cache
			const result2 = await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, not called again
			expect(result2).toEqual([{ name: "James Randi" }]);
		});

		it("does not cache when caching is disabled", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValueOnce([{ id: "1", name: "James Randi" }])
				.mockResolvedValueOnce([{ id: "1", name: "James Randi" }]);

			const config = {
				cache: {
					enabled: false,
				},
				resources: {
					skeptics: {
						query: {
							fetch: mockQuery,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const query = {
				type: "skeptics",
				select: ["name"],
			};

			// First call
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);

			// Second call should hit API again
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(2);
		});

		it("clears cache when creating a resource", async () => {
			const mockQuery = vi
				.fn()
				.mockResolvedValue([{ id: "1", name: "James Randi" }]);
			const mockCreate = vi.fn().mockResolvedValue({
				id: "2",
				name: "New Skeptic",
			});

			const config = {
				cache: {
					enabled: true,
					defaultTTL: 60000, // 1 minute
				},
				resources: {
					skeptics: {
						query: {
							fetch: mockQuery,
						},
						create: {
							fetch: mockCreate,
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const query = {
				type: "skeptics",
				select: ["name"],
			};

			// Query first to populate cache
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1);

			// Query again should use cache (verify caching is working)
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1, should use cache

			// Create a resource (should clear cache)
			await store.create({
				type: "skeptics",
				attributes: { name: "New Skeptic", specialty: "Test", yearsActive: 1 },
			});

			// Query again should hit API (cache was cleared)
			await store.query(query);
			expect(mockQuery).toHaveBeenCalledTimes(2);
		});
	});
});

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("queries skeptics with real handler and mocked fetch", async () => {
		// Mock fetch to return skeptic data
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => [
				{
					id: "1",
					name: "James Randi",
					specialty: "Magic debunking",
					yearsActive: 50,
					famousQuote: "No amount of belief makes something a fact.",
				},
			],
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			select: ["name", "specialty"],
		});

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics",
		);
		expect(result).toEqual([
			{
				name: "James Randi",
				specialty: "Magic debunking",
			},
		]);
	});

	it("queries single skeptic with real handler and mocked fetch", async () => {
		// Mock fetch to return single skeptic data
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "randi",
				name: "James Randi",
				specialty: "Magic debunking",
				yearsActive: 50,
				famousQuote: "No amount of belief makes something a fact.",
			}),
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const result = await store.query({
			type: "skeptics",
			id: "randi",
			select: ["name", "specialty"],
		});

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics/randi",
		);
		expect(result).toEqual({
			name: "James Randi",
			specialty: "Magic debunking",
		});
	});

	it("handles HTTP errors in standard handler", async () => {
		// Mock fetch to return 404 error
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
			url: "https://api.skepticism.example.org/skeptics/nonexistent",
			headers: new Map([["content-type", "application/json"]]),
			json: () => Promise.resolve({ message: "Skeptic not found" }),
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		await expect(
			store.query({
				type: "skeptics",
				id: "nonexistent",
				select: ["name"],
			}),
		).rejects.toThrow("Skeptic not found");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics/nonexistent",
		);
	});

	it("creates resource with standard handler", async () => {
		// Mock fetch for POST request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "new-skeptic",
				name: "New Skeptic",
				specialty: "Critical Thinking",
				yearsActive: 1,
			}),
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {}, // No custom create handler
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const newSkeptic = {
			type: "skeptics",
			attributes: {
				name: "New Skeptic",
				specialty: "Critical Thinking",
				yearsActive: 1,
			},
		};

		const result = await store.create(newSkeptic);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newSkeptic),
			},
		);
		expect(result).toEqual({
			id: "new-skeptic",
			name: "New Skeptic",
			specialty: "Critical Thinking",
			yearsActive: 1,
		});
	});

	it("updates resource with standard handler", async () => {
		// Mock fetch for PATCH request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "randi",
				name: "James Randi",
				specialty: "Updated Specialty",
				yearsActive: 51,
			}),
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {}, // No custom update handler
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const updatedSkeptic = {
			type: "skeptics",
			id: "randi",
			attributes: {
				specialty: "Updated Specialty",
				yearsActive: 51,
			},
		};

		const result = await store.update(updatedSkeptic);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics/randi",
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedSkeptic),
			},
		);
		expect(result).toEqual({
			id: "randi",
			name: "James Randi",
			specialty: "Updated Specialty",
			yearsActive: 51,
		});
	});

	it("deletes resource with standard handler", async () => {
		// Mock fetch for DELETE request (empty response)
		global.fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => "",
		});

		const config = {
			baseURL: "https://api.skepticism.example.org",
			resources: {
				skeptics: {}, // No custom delete handler
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const deleteSkeptic = {
			type: "skeptics",
			id: "randi",
		};

		const result = await store.delete(deleteSkeptic);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.skepticism.example.org/skeptics/randi",
			{
				method: "DELETE",
			},
		);
		// Should return original resource when API returns empty response
		expect(result).toEqual(deleteSkeptic);
	});

	it("uses standard handler when no custom create handler provided", async () => {
		// Mock fetch for standard handler
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "new-skeptic",
				name: "New Skeptic",
				specialty: "Critical Thinking",
			}),
		});

		const config = {
			baseURL: "https://api.example.org",
			resources: {
				skeptics: {
					// no create handler - should use standard handler
				},
			},
		};

		const store = createMultiApiStore(skepticismSchema, config);

		const newSkeptic = {
			type: "skeptics",
			attributes: { name: "New Skeptic" },
		};

		const result = await store.create(newSkeptic);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.example.org/skeptics",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newSkeptic),
			},
		);
		expect(result).toEqual({
			id: "new-skeptic",
			name: "New Skeptic",
			specialty: "Critical Thinking",
		});
	});

	describe("error handling during query execution", () => {
		it("handles async errors from middleware", async () => {
			const badMiddleware = async () => {
				throw new Error("Middleware async error");
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Middleware async error");
		});

		it("handles HTTP error responses with status and data", async () => {
			const httpError = new Error("HTTP Error");
			httpError.response = {
				status: 404,
				data: { message: "Resource not found" },
			};

			const badMiddleware = async () => {
				throw httpError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("HTTP Error");
		});

		it("handles HTTP error responses without custom message", async () => {
			const httpError = new Error("HTTP Error");
			httpError.response = {
				status: 500,
				data: {},
			};

			const badMiddleware = async () => {
				throw httpError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("HTTP Error");
		});

		it("handles network errors (no response received)", async () => {
			const networkError = new Error("Network timeout");
			networkError.request = { url: "https://api.example.com/skeptics" };

			const badMiddleware = async () => {
				throw networkError;
			};

			const config = {
				middleware: [badMiddleware],
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn().mockResolvedValue([{ id: "1", name: "Test" }]),
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Network timeout");
		});

		it("handles errors from resource handlers", async () => {
			const resourceError = new Error("Resource handler error");

			const config = {
				resources: {
					skeptics: {
						query: {
							fetch: vi.fn().mockRejectedValue(resourceError),
						},
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Resource handler error");
		});

		it("handles fetch network errors from standard handler", async () => {
			// Mock fetch to throw a network error
			global.fetch = vi.fn().mockImplementation(() => {
				const networkError = new Error("fetch failed");
				networkError.request = { url: "https://api.example.com/skeptics" };
				return Promise.reject(networkError);
			});

			const config = {
				baseURL: "https://api.example.com",
				resources: {
					skeptics: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("fetch failed");
		});

		it("handles HTTP 404 errors from standard handler", async () => {
			// Mock fetch to return a 404 response
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
				url: "https://api.example.com/skeptics",
				headers: new Map([["content-type", "application/json"]]),
				json: () => Promise.resolve({ message: "Resource not found" }),
			});

			const config = {
				baseURL: "https://api.example.com",
				resources: {
					skeptics: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Resource not found");
		});

		it("handles HTTP 500 errors from standard handler", async () => {
			// Mock fetch to return a 500 response
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				url: "https://api.example.com/skeptics",
				headers: new Map([["content-type", "application/json"]]),
				json: () => Promise.resolve({ message: "Database connection failed" }),
			});

			const config = {
				baseURL: "https://api.example.com",
				resources: {
					skeptics: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Database connection failed");
		});

		it("handles HTTP errors from standard handler with fallback to statusText", async () => {
			// Mock fetch to return a 500 response with invalid JSON
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				statusText: "Forbidden",
				url: "https://api.example.com/skeptics",
				headers: new Map([["content-type", "text/html"]]),
				json: () => Promise.reject(new Error("Not JSON")),
			});

			const config = {
				baseURL: "https://api.example.com",
				resources: {
					skeptics: {
						// No get handler - should use standard handler
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			await expect(
				store.query({ type: "skeptics", select: ["name"] }),
			).rejects.toThrow("Forbidden");
		});
	});
});
