import { beforeEach, expect, it } from "vitest";
import { createMemoryStore } from "../src/memory-store";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bears.schema";

// these tests would fail typescript checking, but are important for those not
// using it

// Test Setup
beforeEach((context) => {
	const store = createMemoryStore(careBearSchema);
	store.seed(careBearData);

	context.store = store;
});

it("fails validation for invalid types", async (context) => {
	expect(async () => {
		await context.store.get({ type: "bearz", id: "1" });
	}).rejects.toThrowError();
});
