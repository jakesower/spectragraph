import { describe, it, expect, beforeEach } from "vitest";
import { createValidator } from "@data-prism/core";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import geojsonSchema from "../../../schemas/geojson.schema.json" with { type: "json" };

describe("Delete Tests", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);

		const validator = createValidator({ schemas: [geojsonSchema] });
		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
			validator,
		});
	});

	it("fails to delete an invalid resource", async () => {
		expect(store.delete({ type: "bears" })).rejects.toThrowError();
	});
});
