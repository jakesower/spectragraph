import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../../../src/multi-api-store.js";
import {
	createWherePushdownEngine,
	pathTemplates,
} from "../../../src/helpers/where-expressions.js";
import utahParksSchema from "../../fixtures/utah-parks.schema.json";

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("where pushdown", () => {
		describe("urls", () => {
			it("pushes a $gt condition to API (implicit $matchesAll)", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { established: { $gt: 1910 } },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?established_gt=1910",
				);
			});

			it("pushes a $gt condition to API directly", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$gt: (operand) => ({
								[`${operand[0].attribute}_gt`]: operand[1],
							}),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { $gt: [{ $get: "established" }, 1910] },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?established_gt=1910",
				);
			});

			it("pushes a $gt condition to API directly with explicit apply", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$gt: (operand, context, { apply }) => {
								const resolved = apply(operand, context);
								return { [`${resolved[0].attribute}_gt`]: resolved[1] };
							},
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { $gt: [{ $get: "established" }, 1910] },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?established_gt=1910",
				);
			});

			it("pushes a $gt condition to API using $pipe", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { $pipe: [{ $get: "established" }, { $gt: 1910 }] },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?established_gt=1910",
				);
			});

			it("pushes a single implicit equality condition to API", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$eq: (value, { attribute }) => ({ [attribute]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { location: "Utah" },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?location=Utah",
				);
			});

			it("pushes multiple conditions to API", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$eq: (value, { attribute }) => ({ [attribute]: value }),
							$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { location: "Utah", established: { $gt: 1910 } },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?location=Utah&established_gt=1910",
				);
			});

			it("does not push unsupported expressions to API", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$eq: (value, { attribute }) => ({ [attribute]: value }),
							$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { established: { $lt: 2000 } },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks",
				);
			});

			it("pushes supported expressions to API even when unsupported are present", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine({
							$eq: (value, { attribute }) => ({ [attribute]: value }),
							$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { location: "Utah", established: { $lt: 2000 } },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?location=Utah",
				);
			});

			describe("$and", () => {
				it("appends query params when multiple $and paths exist", async () => {
					global.fetch.mockResolvedValueOnce({
						ok: true,
						json: async () => [
							{
								id: "zion",
								name: "Zion National Park",
								location: "Utah",
								established: 1919,
								bestSeason: "spring",
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
							where: createWherePushdownEngine({
								$eq: (value, { attribute }) => ({ [attribute]: value }),
								$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
							}),
						},
					};

					const store = createMultiApiStore(utahParksSchema, config);
					store.query({
						type: "parks",
						select: "*",
						where: {
							$and: [{ location: "Utah" }, { established: { $gt: 1910 } }],
						},
					});

					expect(global.fetch).toHaveBeenCalledWith(
						"https://api.nps.example.org/parks?location=Utah&established_gt=1910",
					);
				});
			});

			describe("$or", () => {
				it("does not push down query params when multiple $or paths exist", async () => {
					global.fetch.mockResolvedValueOnce({
						ok: true,
						json: async () => [
							{
								id: "zion",
								name: "Zion National Park",
								location: "Utah",
								established: 1919,
								bestSeason: "spring",
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
							where: createWherePushdownEngine({
								$eq: (value, { attribute }) => ({ [attribute]: value }),
								$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
							}),
						},
					};

					const store = createMultiApiStore(utahParksSchema, config);
					store.query({
						type: "parks",
						select: "*",
						where: {
							$or: [{ location: "Utah" }, { established: { $lt: 2000 } }],
						},
					});

					expect(global.fetch).toHaveBeenCalledWith(
						"https://api.nps.example.org/parks",
					);
				});

				it("pushes down query params when only one branch exists in the $or expression", async () => {
					global.fetch.mockResolvedValueOnce({
						ok: true,
						json: async () => [
							{
								id: "zion",
								name: "Zion National Park",
								location: "Utah",
								established: 1919,
								bestSeason: "spring",
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
							where: createWherePushdownEngine({
								$eq: (value, { attribute }) => ({ [attribute]: value }),
								$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
							}),
						},
					};

					const store = createMultiApiStore(utahParksSchema, config);
					store.query({
						type: "parks",
						select: "*",
						where: {
							$or: [{ location: "Utah" }],
						},
					});

					expect(global.fetch).toHaveBeenCalledWith(
						"https://api.nps.example.org/parks?location=Utah",
					);
				});
			});

			it("ignores $not expressions (cannot meaningfully push down negation)", async () => {
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
						where: createWherePushdownEngine({
							$eq: (value, { attribute }) => ({ [attribute]: value }),
						}),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: {
						$and: [{ location: "Utah" }, { $not: { established: 1919 } }],
					},
				});

				// $not returns {}, so only location gets pushed down
				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?location=Utah",
				);
			});

			describe("nested logical operators", () => {
				it("pushes down $and nested inside $and", async () => {
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
							where: createWherePushdownEngine({
								$eq: (value, { attribute }) => ({ [attribute]: value }),
								$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
							}),
						},
					};

					const store = createMultiApiStore(utahParksSchema, config);
					store.query({
						type: "parks",
						select: "*",
						where: {
							$and: [
								{ location: "Utah" },
								{ $and: [{ established: { $gt: 1910 } }, { name: "Zion" }] },
							],
						},
					});

					expect(global.fetch).toHaveBeenCalledWith(
						"https://api.nps.example.org/parks?location=Utah&established_gt=1910&name=Zion",
					);
				});

				it("swallows params when $or is nested inside $and", async () => {
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
							where: createWherePushdownEngine({
								$eq: (value, { attribute }) => ({ [attribute]: value }),
								$gt: (value, { attribute }) => ({ [`${attribute}_gt`]: value }),
							}),
						},
					};

					const store = createMultiApiStore(utahParksSchema, config);
					store.query({
						type: "parks",
						select: "*",
						where: {
							$and: [
								{ location: "Utah" },
								{ $or: [{ established: { $gt: 1910 } }, { name: "Zion" }] },
							],
						},
					});

					// The $or with multiple branches returns {}, which gets merged into the $and
					// So only the location param survives
					expect(global.fetch).toHaveBeenCalledWith(
						"https://api.nps.example.org/parks?location=Utah",
					);
				});
			});
		});

		describe("templates", () => {
			it("pushes multiple conditions to API", async () => {
				global.fetch.mockResolvedValueOnce({
					ok: true,
					json: async () => [
						{
							id: "zion",
							name: "Zion National Park",
							location: "Utah",
							established: 1919,
							bestSeason: "spring",
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
						where: createWherePushdownEngine(
							pathTemplates({
								$eq: "${attribute}=${value}",
								$gt: "${attribute}_gt=${value}",
							}),
						),
					},
				};

				const store = createMultiApiStore(utahParksSchema, config);
				store.query({
					type: "parks",
					select: "*",
					where: { location: "Utah", established: { $gt: 1910 } },
				});

				expect(global.fetch).toHaveBeenCalledWith(
					"https://api.nps.example.org/parks?location=Utah&established_gt=1910",
				);
			});
		});
	});
});
