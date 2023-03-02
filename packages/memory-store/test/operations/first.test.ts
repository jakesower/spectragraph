import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../../src/memory-store";
import schema from "../fixtures/care-bears.schema.json" assert { type: "json" };
import { careBearData } from "../fixtures/care-bear-data.js";

type LocalTestContext = {
	store: Store;
};

beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(schema);
	store.seed(careBearData);

	context.store = store;
});

it<LocalTestContext>("fetches a single resource", async (context) => {
	const result = await context.store.get({ type: "bears", first: true });
	expect(result).toEqual({ id: "1" });
});

it<LocalTestContext>("throws an error when trying to get the first on a singular resource", async (context) => {
	await expect(async () => {
		await context.store.get({ type: "bears", id: "1", first: true });
	}).rejects.toThrowError();
});
