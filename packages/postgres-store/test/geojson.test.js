import { describe, it, expect, beforeEach } from "vitest";
import { createValidator } from "@data-prism/core";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import { careBearSchema } from "../../interface-tests/src/index.js";
import { careBearData } from "../../interface-tests/src/index.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import geojsonSchema from "../../../schemas/geojson.schema.json" with { type: "json" };

// PostgreSQL-specific GeoJSON/PostGIS functionality tests
describe("PostgreSQL GeoJSON/PostGIS Tests", () => {
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

	describe("Query Operations with Geography", () => {
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
	});

	describe("Update Operations with Geography", () => {
		it.skip("updates a single resource with only attributes, including a geometry attribute", async () => {
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

		it.skip("updates a single resource with only attributes, including a geometry attribute, with the geometry attribute coming from a get request", async () => {
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

	describe("Upsert Operations with Geography", () => {
		describe("create upserts", () => {
			it.skip("upserts a single resource with only attributes, including a geometry attribute", async () => {
				const upserted = await store.upsert({
					type: "homes",
					attributes: {
						name: "Zanzibar",
						location: {
							type: "Point",
							coordinates: [39, 6],
						},
					},
				});

				const result = await store.query({
					type: "homes",
					id: upserted.id,
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

			it.skip("fails to upsert a single resource with an invalid geometry attribute", async () => {
				expect(
					store.upsert({
						type: "homes",
						attributes: {
							name: "Zanzibar",
							location: {
								type: "Point",
								coordinates: [39, 6, "chicken butt"],
							},
						},
					}),
				).rejects.toThrowError();
			});
		});

		describe("update upserts", () => {
			it.skip("updates a single resource with only attributes, including a geometry attribute", async () => {
				const created = await store.create({
					type: "homes",
					attributes: {
						name: "Zanzibar",
					},
				});

				await store.upsert({
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

			it.skip("updates a single resource with only attributes, including a geometry attribute, with the geometry attribute coming from a get request", async () => {
				const created = await store.create({
					type: "homes",
					attributes: {
						name: "Zanzibar",
					},
				});

				await store.upsert({
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

				await store.upsert({
					type: "homes",
					id: created.id,
					attributes: {
						location: result.location,
					},
				});
			});
		});
	});
});