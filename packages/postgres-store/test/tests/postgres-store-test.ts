import { expect, it } from "vitest";
import { db } from "../global-setup.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { Schema } from "data-prism";

await db.connect();

it("won't create a store without a valid schema", () => {
	expect(() => {
		createPostgresStore({} as Schema, {
			...careBearConfig,
			db,
		});
	}).toThrowError();
});
