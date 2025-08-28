import { describe, it, expect, beforeEach } from "vitest";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import { omit } from "es-toolkit";

describe("Get Tests", () => {
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

	it("gets a resource with a to-one and many-to-many relationships", async () => {
		const result = await store.getOne("bears", "1");
		expect(result).toEqual(careBearData.bears[1]);
	});

	it("gets a resource with a to-many relationship", async () => {
		const result = await store.getOne("homes", "1");
		expect(result).toEqual(careBearData.homes[1]);
	});

	it("gets a resource without including relationships", async () => {
		const result = await store.getOne("bears", "1", {
			includeRelationships: false,
		});
		expect(result).toEqual({ ...careBearData.bears[1], relationships: {} });
	});

	it("gets all resources with a to-one and many-to-many relationships", async () => {
		const result = await store.getAll("bears");
		expect(result).toEqual(Object.values(careBearData.bears));
	});

	it("gets all resources with a to-many relationship", async () => {
		const result = await store.getAll("homes");
		expect(result).toEqual(Object.values(careBearData.homes));
	});

	it("gets all resources without relationships", async () => {
		const result = await store.getAll("bears", { includeRelationships: false });
		expect(result).toEqual(
			Object.values(careBearData.bears).map((r) => omit(r, ["relationships"])),
		);
	});
});
