import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../../../src/multi-api-store.js";
import { createWherePushdownEngine } from "../../../src/helpers/where-expressions.js";
import utahParksSchema from "../../fixtures/utah-parks.schema.json";

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("where pushdown", () => {
		it("pushes a single equality to API", async () => {
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
						$eq: (attribute, value) => ({ [attribute]: value }),
					}),
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);
			store.query({ type: "parks", select: "*", where: { location: "Utah" } });

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks?location=Utah",
			);
		});
	});
});
