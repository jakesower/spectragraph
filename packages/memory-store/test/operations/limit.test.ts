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
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		limit: 1,
	});

	expect(result).toEqual([{ name: "Tenderheart Bear" }]);
});

it<LocalTestContext>("limits after sorting", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		limit: 2,
	});

	expect(result).toEqual([{ name: "Cheer Bear" }, { name: "Smart Heart Bear" }]);
});

it<LocalTestContext>("limits after sorting with 1", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		limit: 1,
	});

	expect(result).toEqual([{ name: "Cheer Bear" }]);
});

it<LocalTestContext>("limits with an offset", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		limit: 2,
		offset: 1,
	});

	expect(result).toEqual([{ name: "Smart Heart Bear" }, { name: "Tenderheart Bear" }]);
});

it<LocalTestContext>("allows for offset only", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		offset: 1,
	});

	expect(result).toEqual([
		{ name: "Smart Heart Bear" },
		{ name: "Tenderheart Bear" },
		{ name: "Wish Bear" },
	]);
});

it<LocalTestContext>("allows for limit + offset to exceed size of data", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		limit: 6,
		offset: 2,
	});

	expect(result).toEqual([{ name: "Tenderheart Bear" }, { name: "Wish Bear" }]);
});

it<LocalTestContext>("returns nothing when the offset has surpassed the data size", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		limit: 6,
		offset: 20,
	});

	expect(result).toEqual([]);
});

it<LocalTestContext>("allows a zero offset", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {} },
		order: [{ property: "name", direction: "asc" }],
		offset: 0,
	});

	expect(result).toEqual([
		{ name: "Cheer Bear" },
		{ name: "Smart Heart Bear" },
		{ name: "Tenderheart Bear" },
		{ name: "Wish Bear" },
	]);
});

it<LocalTestContext>("errors for a bad limit", async (context) => {
	await expect(async () => {
		await context.store.get({
			type: "bears",
			limit: 0,
		});
	}).rejects.toThrowError();
});

it<LocalTestContext>("errors for a bad offset", async (context) => {
	await expect(async () => {
		await context.store.get({
			type: "bears",
			limit: 3,
			offset: -1,
		});
	}).rejects.toThrowError();
});
