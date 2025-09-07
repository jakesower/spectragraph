import { expect, it, describe, vi } from "vitest";
import { collectQueryResults, executeQueryWithAPIs } from "../src/multi-api.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";
import { compileFormatter, extractWhere } from "../src/rest-formatters.js";
import { normalizeQuery } from "@data-prism/core";

describe("extract where", () => {
	const formatBasic = compileFormatter({
		$eq: "${attribute}=${value}",
		$ne: "${attribute}_ne=${value}",
		$lt: "${attribute}_lt=${value}",
		$lte: "${attribute}_lte=${value}",
		$gt: "${attribute}_gt=${value}",
		$gte: "${attribute}_gte=${value}",
	});

	describe("$eq and $and between attributes", () => {
		it("processes the simplest equality condition", () => {
			const { where } = normalizeQuery(skepticismSchema, {
				type: "skeptics",
				select: ["*"],
				where: { name: "Steven Novella" },
			});

			const result = extractWhere(where);
			expect(result).toEqual([
				{
					attribute: "name",
					value: "Steven Novella",
					expressionName: "$eq",
				},
			]);

			const formatted = result.map(formatBasic);
			expect(formatted).toEqual(["name=Steven Novella"]);
		});

		it("handles two equality conditions", () => {
			const { where } = normalizeQuery(skepticismSchema, {
				type: "skeptics",
				select: ["*"],
				where: {
					name: "Steven Novella",
					famousQuote:
						"Some claims deserve ridicule, and anything less falsely elevates them.",
				},
			});

			const result = extractWhere(where);
			expect(result).toEqual([
				{
					attribute: "name",
					value: "Steven Novella",
					expressionName: "$eq",
				},
				{
					attribute: "famousQuote",
					value:
						"Some claims deserve ridicule, and anything less falsely elevates them.",
					expressionName: "$eq",
				},
			]);

			const formatted = result.map(formatBasic);
			expect(formatted).toEqual([
				"name=Steven Novella",
				"famousQuote=Some claims deserve ridicule, and anything less falsely elevates them.",
			]);
		});
	});

	describe("comparative expressions", () => {
		["$ne", "$lt", "$lte", "$gt", "$gte"].forEach((expr) => {
			it(`handles ${expr}`, () => {
				const { where } = normalizeQuery(skepticismSchema, {
					type: "weirdBeliefs",
					select: "*",
					where: { believersCount: { [expr]: 100000 } },
				});

				const result = extractWhere(where);
				expect(result).toEqual([
					{
						attribute: "believersCount",
						expressionName: expr,
						value: 100000,
					},
				]);

				const formatted = result.map(formatBasic);
				expect(formatted).toEqual([`believersCount_${expr.slice(1)}=100000`]);
			});
		});
	});
});

describe.skip("collectQueryResults", () => {
	it("executes a simple query without relationships", async () => {
		const executor = vi.fn().mockResolvedValue("mock-result");
		const query = {
			type: "skeptics",
			select: { name: "name" },
		};

		const result = await collectQueryResults(
			skepticismSchema,
			query,
			executor,
			{ initialContext: true },
		);

		expect(executor).toHaveBeenCalledOnce();
		expect(executor).toHaveBeenCalledWith(query, { initialContext: true });
		expect(result).toEqual(["mock-result"]);
	});

	it("executes query with relationships", async () => {
		const executor = vi
			.fn()
			.mockResolvedValueOnce("skeptic-result")
			.mockResolvedValueOnce("investigation-result");

		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: { title: "title" },
				},
			},
		};

		const result = await collectQueryResults(
			skepticismSchema,
			query,
			executor,
			{ initialContext: true },
		);

		expect(executor).toHaveBeenCalledTimes(2);
		expect(executor).toHaveBeenNthCalledWith(1, query, {
			initialContext: true,
		});
		expect(executor).toHaveBeenNthCalledWith(2, query.select.investigations, {
			initialContext: true,
			parentQuery: query,
		});
		expect(result).toEqual(["skeptic-result", ["investigation-result"]]);
	});

	it("handles nested relationships", async () => {
		const executor = vi
			.fn()
			.mockResolvedValueOnce("skeptic-result")
			.mockResolvedValueOnce("investigation-result")
			.mockResolvedValueOnce("belief-result");

		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: {
						title: "title",
						subject: {
							type: "weirdBeliefs",
							select: { name: "name", debunked: "debunked" },
						},
					},
				},
			},
		};

		const result = await collectQueryResults(skepticismSchema, query, executor);

		expect(executor).toHaveBeenCalledTimes(3);
		expect(result).toEqual([
			"skeptic-result",
			["investigation-result", ["belief-result"]],
		]);
	});

	it("passes context correctly through traversal", async () => {
		const executor = vi.fn().mockResolvedValue("result");
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: { title: "title" },
				},
			},
		};

		await collectQueryResults(skepticismSchema, query, executor, {
			userId: "test-user",
		});

		expect(executor).toHaveBeenNthCalledWith(1, query, { userId: "test-user" });
		expect(executor).toHaveBeenNthCalledWith(2, query.select.investigations, {
			userId: "test-user",
			parentQuery: query,
		});
	});
});

describe.skip("executeQueryWithAPIs", () => {
	const mockAPIs = {
		skeptics: {
			get: vi.fn().mockResolvedValue([
				{
					id: "rebecca-watson",
					name: "Rebecca Watson",
					specialty: "Feminist skepticism",
					yearsActive: 18,
					famousQuote: "Skepticism isn't a belief system. It's a method.",
				},
			]),
		},
		investigations: {
			get: vi.fn().mockResolvedValue([
				{
					id: "watson-homeopathy-study",
					title: "Homeopathic Remedies: A Controlled Study",
					claimTested: "Homeopathic remedies are more effective than placebo",
					methodsUsed: ["double-blind", "placebo-controlled"],
					conclusion: "No significant difference from placebo observed",
					publicationYear: 2010,
				},
			]),
		},
		weirdBeliefs: {
			get: vi.fn().mockResolvedValue([
				{
					id: "homeopathy",
					name: "Homeopathy",
					description: "The belief that water has memory",
					category: "alternative medicine",
					believersCount: 200000000,
					debunked: true,
				},
			]),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("executes simple query and returns graph", async () => {
		const query = {
			type: "skeptics",
			select: { name: "name", specialty: "specialty" },
		};

		const result = await executeQueryWithAPIs(
			skepticismSchema,
			query,
			mockAPIs,
		);

		expect(mockAPIs.skeptics.get).toHaveBeenCalledOnce();
		expect(result).toMatchObject({
			skeptics: {
				"rebecca-watson": {
					type: "skeptics",
					id: "rebecca-watson",
					attributes: expect.objectContaining({
						name: "Rebecca Watson",
						specialty: "Feminist skepticism",
					}),
				},
			},
		});
	});

	it("handles special handlers", async () => {
		const specialHandler = {
			test: (query, context) =>
				query.type === "skeptics" && context.specialCase,
			handler: vi.fn().mockResolvedValue([
				{
					id: "special-skeptic",
					name: "Special Skeptic",
					specialty: "Special handling",
				},
			]),
		};

		const query = { type: "skeptics", select: { name: "name" } };

		const result = await executeQueryWithAPIs(
			skepticismSchema,
			query,
			mockAPIs,
			{
				context: { specialCase: true },
				specialHandlers: [specialHandler],
			},
		);

		expect(specialHandler.handler).toHaveBeenCalledOnce();
		expect(mockAPIs.skeptics.get).not.toHaveBeenCalled();
		expect(result.skeptics["special-skeptic"]).toBeDefined();
	});

	it("handles HTTP errors properly", async () => {
		const failingAPI = {
			skeptics: {
				get: vi.fn().mockRejectedValue({
					response: { status: 404, data: { message: "Not found" } },
				}),
			},
		};

		const query = { type: "skeptics", select: { name: "name" } };

		await expect(
			executeQueryWithAPIs(skepticismSchema, query, failingAPI),
		).rejects.toThrow("Failed to load skeptics: 404 Not found");
	});

	it("handles network errors properly", async () => {
		const failingAPI = {
			skeptics: {
				get: vi.fn().mockRejectedValue({
					request: true,
					message: "Network timeout",
				}),
			},
		};

		const query = { type: "skeptics", select: { name: "name" } };

		await expect(
			executeQueryWithAPIs(skepticismSchema, query, failingAPI),
		).rejects.toThrow("Network error loading skeptics: Network timeout");
	});

	it("handles missing API handlers", async () => {
		const incompleteAPIs = {
			skeptics: mockAPIs.skeptics,
			// missing investigations API
		};

		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: { title: "title" },
				},
			},
		};

		await expect(
			executeQueryWithAPIs(skepticismSchema, query, incompleteAPIs),
		).rejects.toThrow("No API handler found for resource type: investigations");
	});

	it("merges graphs from multiple API calls", async () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: {
						title: "title",
						subject: {
							type: "weirdBeliefs",
							select: { name: "name", debunked: "debunked" },
						},
					},
				},
			},
		};

		const result = await executeQueryWithAPIs(
			skepticismSchema,
			query,
			mockAPIs,
		);

		// Should have called all three APIs
		expect(mockAPIs.skeptics.get).toHaveBeenCalledOnce();
		expect(mockAPIs.investigations.get).toHaveBeenCalledOnce();
		expect(mockAPIs.weirdBeliefs.get).toHaveBeenCalledOnce();

		// Should have merged all resources into one graph
		expect(result).toMatchObject({
			skeptics: expect.any(Object),
			investigations: expect.any(Object),
			weirdBeliefs: expect.any(Object),
		});
	});

	it("handles empty API responses", async () => {
		const emptyAPIs = {
			skeptics: {
				get: vi.fn().mockResolvedValue([]),
			},
		};

		const query = { type: "skeptics", select: { name: "name" } };

		const result = await executeQueryWithAPIs(
			skepticismSchema,
			query,
			emptyAPIs,
		);

		expect(result).toMatchObject({
			skeptics: {},
			investigations: {},
			weirdBeliefs: {},
			organizations: {},
		});
	});

	it("handles null API responses", async () => {
		const nullAPIs = {
			skeptics: {
				get: vi.fn().mockResolvedValue(null),
			},
		};

		const query = { type: "skeptics", select: { name: "name" } };

		const result = await executeQueryWithAPIs(
			skepticismSchema,
			query,
			nullAPIs,
		);

		expect(result).toMatchObject({
			skeptics: {},
			investigations: {},
			weirdBeliefs: {},
			organizations: {},
		});
	});
});
