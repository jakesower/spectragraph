import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";

describe("createMultiApiStore", () => {
	it("queries skeptics with mocked get handler", async () => {
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
			resources: {
				skeptics: {
					get: mockGet,
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
				schema: skepticismSchema,
				config,
				query: {
					type: "skeptics",
					select: { name: "name", specialty: "specialty" },
				},
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
		const mockGet = vi.fn().mockResolvedValue([
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
					get: mockGet,
					mappers: {
						name: "moniker",
						yearsActive: (res) => Math.round(res.decadesActive / 10),
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
				schema: skepticismSchema,
				config,
				query: {
					type: "skeptics",
					select: { name: "name", specialty: "specialty" },
				},
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
					get: mockSkepticsGet,
				},
				investigations: {
					get: mockInvestigationsGet,
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
				config,
				query: {
					type: "skeptics",
					select: { name: "name", investigations: expect.any(Object) },
				},
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				config,
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
					get: mockSkepticsGet,
				},
				investigations: {
					mappers: {
						investigator: "investigator_id",
					},
					get: mockInvestigationsGet,
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
				config,
				query: {
					type: "skeptics",
					select: { name: "name", investigations: expect.any(Object) },
				},
			}),
		);

		expect(mockInvestigationsGet).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: skepticismSchema,
				config,
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
					get: mockSkepticsGet,
				},
				investigations: {
					get: mockInvestigationsGet,
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
				config,
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
						get: vi.fn(),
						create: mockCreate,
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

			expect(mockCreate).toHaveBeenCalledWith(newSkeptic, {
				schema: skepticismSchema,
				config,
			});
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
						get: vi.fn(),
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
						get: vi.fn(),
						update: mockUpdate,
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

			expect(mockUpdate).toHaveBeenCalledWith(updateSkeptic, {
				schema: skepticismSchema,
				config,
			});
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
						get: vi.fn(),
						delete: mockDelete,
					},
				},
			};

			const store = createMultiApiStore(skepticismSchema, config);

			const deleteSkeptic = {
				type: "skeptics",
				id: "1",
			};

			const result = await store.delete(deleteSkeptic);

			expect(mockDelete).toHaveBeenCalledWith(deleteSkeptic, {
				schema: skepticismSchema,
				config,
			});
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
			const mockGet = vi
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
						get: mockGet,
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
			expect(mockGet).toHaveBeenCalledTimes(1);
			expect(result1).toEqual([{ name: "James Randi" }]);

			// Second call should use cache
			const result2 = await store.query(query);
			expect(mockGet).toHaveBeenCalledTimes(1); // Still 1, not called again
			expect(result2).toEqual([{ name: "James Randi" }]);
		});

		it("does not cache when caching is disabled", async () => {
			const mockGet = vi
				.fn()
				.mockResolvedValueOnce([{ id: "1", name: "James Randi" }])
				.mockResolvedValueOnce([{ id: "1", name: "James Randi" }]);

			const config = {
				cache: {
					enabled: false,
				},
				resources: {
					skeptics: {
						get: mockGet,
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
			expect(mockGet).toHaveBeenCalledTimes(1);

			// Second call should hit API again
			await store.query(query);
			expect(mockGet).toHaveBeenCalledTimes(2);
		});

		it("clears cache when creating a resource", async () => {
			const mockGet = vi
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
						get: mockGet,
						create: mockCreate,
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
			expect(mockGet).toHaveBeenCalledTimes(1);

			// Create a resource (should clear cache)
			await store.create({
				type: "skeptics",
				attributes: { name: "New Skeptic", specialty: "Test", yearsActive: 1 },
			});

			// Query again should hit API (cache was cleared)
			await store.query(query);
			expect(mockGet).toHaveBeenCalledTimes(2);
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
		).rejects.toThrow("HTTP 404: Not Found");

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
		// Mock fetch for PUT request
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
				method: "PUT",
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
});
