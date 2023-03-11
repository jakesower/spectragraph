import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../../src/memory-store";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bears.schema";

type LocalTestContext = {
	store: Store;
};

beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(careBearSchema);
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
