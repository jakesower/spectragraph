import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { getClient, initializeClient } from "./get-client.js";

// Most query tests are covered by interface-tests via interface.test.js
// This file contains PostgreSQL-specific query functionality tests

describe("PostgreSQL-Specific Query Tests", () => {
	let store;
	let db;

	beforeAll(async () => {
		await initializeClient();
	});

	beforeEach(() => {
		db = getClient();

		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
		});
	});


	it("uses explicitly set id fields", async () => {
		const result = await store.query({
			type: "powers",
			id: "careBearStare",
			select: ["powerId", "name"],
		});

		expect(result).toEqual({
			powerId: "careBearStare",
			name: "Care Bear Stare",
		});
	});

	it("uses explicitly set id fields without fetching the ID", async () => {
		const result = await store.query({
			type: "powers",
			id: "careBearStare",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Care Bear Stare" });
	});

	it("uses explicitly set id fields without fetching the ID when the ID is not an attribute", async () => {
		const result = await store.query({
			type: "companions",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Brave Heart Lion" });
	});

	// ignoring non-core expressions for now
	describe.skip("PostgreSQL-specific expression operators", () => {
		it("filters using $matchesGlob operator with wildcard", async () => {
			const result = await store.query({
				type: "bears",
				select: ["name"],
				where: {
					name: { $matchesGlob: "*Heart*" },
				},
				orderBy: { property: "name", direction: "asc" },
			});

			expect(result).toEqual([
				{ name: "Tenderheart Bear" },
				{ name: "Smart Heart Bear" },
			]);
		});

		it("filters using $matchesGlob operator with question mark", async () => {
			const result = await store.query({
				type: "bears",
				select: ["name"],
				where: {
					name: { $matchesGlob: "?heer Bear" },
				},
			});

			expect(result).toEqual([{ name: "Cheer Bear" }]);
		});

		it("filters using $matchesGlob operator with multiple wildcards", async () => {
			const result = await store.query({
				type: "bears",
				select: ["name"],
				where: {
					name: { $matchesGlob: "?*h Bear" },
				},
				orderBy: { property: "name", direction: "asc" },
			});

			expect(result).toEqual([{ name: "Wish Bear" }]);
		});

		it("filters using $matchesGlob operator with companions", async () => {
			const result = await store.query({
				type: "companions",
				select: ["name"],
				where: {
					name: { $matchesGlob: "*Heart*" },
				},
				orderBy: { property: "name", direction: "asc" },
			});

			expect(result).toEqual([
				{ name: "Brave Heart Lion" },
				{ name: "Cozy Heart Penguin" },
				{ name: "Loyal Heart Dog" },
			]);
		});

		it("filters using $matchesGlob operator with no matches", async () => {
			const result = await store.query({
				type: "bears",
				select: ["name"],
				where: {
					name: { $matchesGlob: "*XYZ*" },
				},
			});

			expect(result).toEqual([]);
		});
	});
});
