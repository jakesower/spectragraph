import { expect, it } from "vitest";
import { db } from "./global-setup.js";
import { createPostgresStore } from "../src/postgres-store.js";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";
import { Schema } from "data-prism";
import { omit } from "lodash-es";

await db.connect();
const store = createPostgresStore(careBearSchema as Schema, {
	...careBearConfig,
	db,
});
await reset(db, careBearSchema, careBearConfig, careBearData);

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
	expect(result).toEqual(omit(careBearData.bears[1], "relationships"));
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
		Object.values(careBearData.bears).map((r: any) =>
			omit(r, ["relationships"]),
		),
	);
});
