import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../../../src/multi-api-store.js";
import utahParksSchema from "../../fixtures/utah-parks.schema.json";

describe("handler tests - other clause pushdown", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("select pushdown", () => {
		it("pushes select fields to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						location: "Utah",
						expr: { $literal: 3 },
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					select: {
						apply: (selectClause) => {
							const selectedAttributes = Object.values(selectClause).filter(
								(f) => typeof f === "string",
							);
							return { fields: selectedAttributes.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: ["id", "name", "location"],
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?fields=id%2Cname%2Clocation",
			);
		});
	});

	describe("limit pushdown", () => {
		it("pushes limit to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						location: "Utah",
					},
					{
						id: "bryce",
						name: "Bryce Canyon National Park",
						location: "Utah",
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					limit: {
						apply: (limit) => ({ limit }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*", limit: 2 });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?limit=2",
			);
		});

		it("handles query without limit", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					limit: {
						apply: (limit) => ({ limit: limit }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*" });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks",
			);
		});
	});

	describe("offset pushdown", () => {
		it("pushes offset to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "arches",
						name: "Arches National Park",
						location: "Utah",
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					offset: {
						apply: (offsetValue) => ({ offset: offsetValue }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*", offset: 10 });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?offset=10",
			);
		});

		it("handles query without offset", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					offset: {
						apply: (offsetValue) => ({ offset: offsetValue }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*" });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks",
			);
		});
	});

	describe("order pushdown", () => {
		it("pushes single order field to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						established: 1919,
					},
					{
						id: "bryce",
						name: "Bryce Canyon National Park",
						established: 1928,
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					order: {
						apply: (orderClause) => {
							// orderClause is array of objects like [{ established: "asc" }]
							const orderParts = orderClause.map((orderObj) => {
								const [field, direction] = Object.entries(orderObj)[0];
								return direction === "desc" ? `-${field}` : field;
							});
							return { sort: orderParts.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: "*",
				order: { established: "asc" },
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?sort=established",
			);
		});

		it("pushes multiple order fields to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					order: {
						apply: (orderClause) => {
							// orderClause is array of objects like [{ location: "asc" }, { established: "desc" }]
							const orderParts = orderClause.map((orderObj) => {
								const [field, direction] = Object.entries(orderObj)[0];
								return direction === "desc" ? `-${field}` : field;
							});
							return { sort: orderParts.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: "*",
				order: [{ location: "asc" }, { established: "desc" }],
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?sort=location%2C-established",
			);
		});

		it("handles descending order", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					order: {
						apply: (orderClause) => {
							// orderClause is array of objects like [{ established: "desc" }]
							const orderParts = orderClause.map((orderObj) => {
								const [field, direction] = Object.entries(orderObj)[0];
								return direction === "desc" ? `-${field}` : field;
							});
							return { sort: orderParts.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: "*",
				order: { established: "desc" },
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?sort=-established",
			);
		});

		it("handles query without order", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					order: {
						apply: (orderClause) => {
							// orderClause is array of objects like [{ established: "desc" }]
							const orderParts = orderClause.map((orderObj) => {
								const [field, direction] = Object.entries(orderObj)[0];
								return direction === "desc" ? `-${field}` : field;
							});
							return { sort: orderParts.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*" });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks",
			);
		});
	});

	describe("ids pushdown", () => {
		it("pushes single id to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						location: "Utah",
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					ids: {
						apply: (idsArray) => ({ id: idsArray.join(",") }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*", ids: ["zion"] });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?id=zion",
			);
		});

		it("pushes multiple ids to API", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						location: "Utah",
					},
					{
						id: "bryce",
						name: "Bryce Canyon National Park",
						location: "Utah",
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					ids: {
						apply: (idsArray) => ({ id: idsArray.join(",") }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: "*",
				ids: ["zion", "bryce", "arches"],
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?id=zion%2Cbryce%2Carches",
			);
		});

		it("handles query without ids", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					ids: {
						apply: (idsArray) => ({ id: idsArray.join(",") }),
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({ type: "parks", select: "*" });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks",
			);
		});
	});

	describe("combined pushdown", () => {
		it("pushes multiple clauses to API simultaneously", async () => {
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: "zion",
						name: "Zion National Park",
						location: "Utah",
					},
				],
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
				pushdown: {
					select: {
						apply: (selectClause) => {
							const selectedAttributes = Object.values(selectClause).filter(
								(f) => typeof f === "string",
							);
							return { fields: selectedAttributes.join(",") };
						},
					},
					limit: {
						apply: (limitValue) => ({ limit: limitValue }),
					},
					offset: {
						apply: (offsetValue) => ({ offset: offsetValue }),
					},
					order: {
						apply: (orderClause) => {
							// orderClause is array of objects like [{ established: "desc" }]
							const orderParts = orderClause.map((orderObj) => {
								const [field, direction] = Object.entries(orderObj)[0];
								return direction === "desc" ? `-${field}` : field;
							});
							return { sort: orderParts.join(",") };
						},
					},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			await store.query({
				type: "parks",
				select: ["id", "name", "location"],
				limit: 5,
				offset: 10,
				order: { name: "desc" },
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?fields=id%2Cname%2Clocation&limit=5&offset=10&sort=-name",
			);
		});
	});
});
