import { describe, it, expect, beforeEach } from "vitest";
import { createValidator } from "@data-prism/core";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import geojsonSchema from "../../../schemas/geojson.schema.json" with { type: "json" };

describe("Update Tests", () => {
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

	it("updates a single resource with only attributes, including a geometry attribute", async () => {
		const created = await store.create({
			type: "homes",
			attributes: {
				name: "Zanzibar",
			},
		});

		await store.update({
			type: "homes",
			id: created.id,
			attributes: {
				location: {
					type: "Point",
					coordinates: [39, 6],
				},
			},
		});

		const result = await store.query({
			type: "homes",
			id: created.id,
			select: ["name", "location"],
		});

		expect(result).toEqual({
			name: "Zanzibar",
			location: {
				type: "Point",
				coordinates: [39, 6],
			},
		});
	});

	it("updates a single resource with only attributes, including a geometry attribute, with the geometry attribute coming from a get request", async () => {
		const created = await store.create({
			type: "homes",
			attributes: {
				name: "Zanzibar",
			},
		});

		await store.update({
			type: "homes",
			id: created.id,
			attributes: {
				location: {
					type: "Point",
					coordinates: [39, 6],
				},
			},
		});

		const result = await store.query({
			type: "homes",
			id: created.id,
			select: ["name", "location"],
		});

		expect(result).toEqual({
			name: "Zanzibar",
			location: {
				type: "Point",
				coordinates: [39, 6],
			},
		});

		await store.update({
			type: "homes",
			id: created.id,
			attributes: {
				location: result.location,
			},
		});
	});
});
