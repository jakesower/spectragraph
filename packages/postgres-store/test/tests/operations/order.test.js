import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../../get-client.js";
import { createPostgresStore } from "../../../src/postgres-store.js";
import careBearSchema from "../../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "../../fixtures/care-bear-config.js";
import { careBearData } from "../../fixtures/care-bear-data.js";
import { reset } from "../../../scripts/seed.js";

describe("Order Operations", () => {
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

	describe("order tests", () => {
		it("sorts on a numeric field", async () => {
			const result = await store.query({
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
				order: { yearIntroduced: "desc" },
			});

			expect(result).toEqual([
				{ name: "Smart Heart Bear", yearIntroduced: 2005 },
				{ name: "Cheer Bear", yearIntroduced: 1982 },
				{ name: "Tenderheart Bear", yearIntroduced: 1982 },
				{ name: "Wish Bear", yearIntroduced: 1982 },
			]);
		});
	});
});