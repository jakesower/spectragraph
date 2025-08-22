import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../../get-client.js";
import { createPostgresStore } from "../../../src/postgres-store.js";
import careBearSchema from "../../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "../../fixtures/care-bear-config.js";
import { reset } from "../../../scripts/seed.js";
import { careBearData } from "../../fixtures/care-bear-data.js";

describe("Limit/Offset Operations", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);
		
		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
		});
	});

	describe("limit/offset", () => {
		it("fetches a single resource", async () => {
			const result = await store.query({
				type: "bears",
				select: { name: "name" },
				limit: 1,
			});

			expect(result).toEqual([{ name: "Tenderheart Bear" }]);
		});

		it("fetches two resources", async () => {
			const result = await store.query({
				type: "bears",
				select: { name: "name" },
				limit: 2,
			});

			expect(result).toEqual([
				{ name: "Tenderheart Bear" },
				{ name: "Cheer Bear" },
			]);
		});

		it("fetches a single resource with offset", async () => {
			const result = await store.query({
				type: "bears",
				select: { name: "name" },
				limit: 1,
				offset: 1,
			});

			expect(result).toEqual([{ name: "Cheer Bear" }]);
		});

		it("fetches two resources with offset", async () => {
			const result = await store.query({
				type: "bears",
				select: { name: "name" },
				limit: 2,
				offset: 1,
			});

			expect(result).toEqual([{ name: "Cheer Bear" }, { name: "Wish Bear" }]);
		});
	});
});