import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../get-client.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import { careBearSchema } from "../../../interface-tests/src/index.js";
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { careBearData } from "../../../interface-tests/src/index.js";
import { reset } from "../../scripts/seed.js";

// Most where clause tests are covered by interface-tests via interface.test.js
// This file contains PostgreSQL-specific where functionality tests

describe("PostgreSQL-Specific Where Operations", () => {
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

	describe("PostgreSQL-specific where functionality", () => {
		it.todo("filters on a to-one relationship");

		it.skip("filters related resources when the attribute being filtered on is not in the select clause", async () => {
			const result = await store.query({
				type: "powers",
				id: "careBearStare",
				select: {
					powerId: "powerId",
					wielders: {
						select: ["id"],
						where: {
							bellyBadge: { $eq: "shooting star" },
						},
					},
				},
			});

			expect(result).toEqual({
				powerId: "careBearStare",
				wielders: [{ id: "3" }],
			});
		});
	});
});