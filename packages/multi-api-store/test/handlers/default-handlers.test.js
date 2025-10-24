import { expect, it, describe, vi, beforeEach, afterEach } from "vitest";
import { createMultiApiStore } from "../../src/multi-api-store.js";
import utahParksSchema from "../fixtures/utah-parks.schema.json";

describe("handler tests", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("default cases", () => {
		it("queries parks with real handler and mocked fetch", async () => {
			// Mock fetch to return park data
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
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				select: ["name", "location"],
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks",
			);
			expect(result).toEqual([
				{
					name: "Zion National Park",
					location: "Utah",
				},
			]);
		});

		it("queries single park with real handler and mocked fetch", async () => {
			// Mock fetch to return single park data
			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "zion",
					name: "Zion National Park",
					location: "Utah",
					established: 1919,
					bestSeason: "spring",
				}),
			});

			const config = {
				request: {
					baseURL: "https://api.nps.example.org",
				},
				resources: {
					parks: {},
				},
			};

			const store = createMultiApiStore(utahParksSchema, config);

			const result = await store.query({
				type: "parks",
				id: "zion",
				select: ["name", "location"],
			});

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.nps.example.org/parks/zion",
			);
			expect(result).toEqual({
				name: "Zion National Park",
				location: "Utah",
			});
		});
	});
});
