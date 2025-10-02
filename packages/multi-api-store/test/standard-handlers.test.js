import { expect, it, describe, beforeEach, afterEach, vi } from "vitest";
import { createMultiApiStore } from "../src/multi-api-store.js";
import utahParksSchema from "./fixtures/utah-parks.schema.json";

describe("standard handlers", () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("handles HTTP errors in standard handler", async () => {
		// Mock fetch to return 404 error
		global.fetch.mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
			url: "https://api.nps.example.org/parks/nonexistent",
			headers: new Map([["content-type", "application/json"]]),
			json: () => Promise.resolve({ message: "Park not found" }),
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

		await expect(
			store.query({
				type: "parks",
				id: "nonexistent",
				select: ["name"],
			}),
		).rejects.toThrow("Park not found");

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/nonexistent",
		);
	});

	it("creates resource with standard handler", async () => {
		// Mock fetch for POST request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "canyonlands",
				name: "Canyonlands National Park",
				location: "Utah",
				established: 1964,
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom create handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const newPark = {
			type: "parks",
			attributes: {
				name: "Canyonlands National Park",
				location: "Utah",
				established: 1964,
			},
		};

		const result = await store.create(newPark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newPark),
			},
		);
		expect(result).toEqual({
			id: "canyonlands",
			name: "Canyonlands National Park",
			location: "Utah",
			established: 1964,
		});
	});

	it("updates resource with standard handler", async () => {
		// Mock fetch for PATCH request
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "zion",
				name: "Zion National Park",
				location: "Utah",
				bestSeason: "winter",
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom update handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const updatedPark = {
			type: "parks",
			id: "zion",
			attributes: {
				bestSeason: "winter",
			},
		};

		const result = await store.update(updatedPark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/zion",
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPark),
			},
		);
		expect(result).toEqual({
			id: "zion",
			name: "Zion National Park",
			location: "Utah",
			bestSeason: "winter",
		});
	});

	it("deletes resource with standard handler", async () => {
		// Mock fetch for DELETE request (empty response)
		global.fetch.mockResolvedValueOnce({
			ok: true,
			text: async () => "",
		});

		const config = {
			request: {
				baseURL: "https://api.nps.example.org",
			},
			resources: {
				parks: {}, // No custom delete handler
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const deletePark = {
			type: "parks",
			id: "zion",
		};

		const result = await store.delete(deletePark);

		expect(global.fetch).toHaveBeenCalledWith(
			"https://api.nps.example.org/parks/zion",
			{
				method: "DELETE",
			},
		);
		// Should return original resource when API returns empty response
		expect(result).toEqual(deletePark);
	});

	it("uses standard handler when no custom create handler provided", async () => {
		// Mock fetch for standard handler
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "arches",
				name: "Arches National Park",
				location: "Utah",
			}),
		});

		const config = {
			request: {
				baseURL: "https://api.example.org",
			},
			resources: {
				parks: {
					// no create handler - should use standard handler
				},
			},
		};

		const store = createMultiApiStore(utahParksSchema, config);

		const newPark = {
			type: "parks",
			attributes: { name: "Arches National Park" },
		};

		const result = await store.create(newPark);

		expect(global.fetch).toHaveBeenCalledWith("https://api.example.org/parks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(newPark),
		});
		expect(result).toEqual({
			id: "arches",
			name: "Arches National Park",
			location: "Utah",
		});
	});
});
