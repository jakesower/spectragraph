import { describe, it, expect, beforeEach } from "vitest";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";

describe("Query Tests", () => {
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

	it.skip("fetches a single resource with a geography column", async () => {
		const result = await store.query({
			type: "homes",
			id: "1",
			select: {
				location: "location",
			},
		});

		expect(result).toEqual({
			location: {
				type: "Point",
				coordinates: [-119.557320248, 46.820255868],
			},
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
});
