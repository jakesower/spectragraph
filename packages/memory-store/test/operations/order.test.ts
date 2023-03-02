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

it<LocalTestContext>("sorts on a numeric field", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {}, yearIntroduced: {} },
		order: [{ property: "yearIntroduced", direction: "desc" }],
	});

	expect(result).toEqual([
		{ name: "Smart Heart Bear", yearIntroduced: 2005 },
		{ name: "Tenderheart Bear", yearIntroduced: 1982 },
		{ name: "Cheer Bear", yearIntroduced: 1982 },
		{ name: "Wish Bear", yearIntroduced: 1982 },
	]);
});

it<LocalTestContext>("sorts on a string field", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {}, yearIntroduced: {} },
		order: [{ property: "name", direction: "asc" }],
	});

	expect(result).toEqual([
		{ name: "Cheer Bear", yearIntroduced: 1982 },
		{ name: "Smart Heart Bear", yearIntroduced: 2005 },
		{ name: "Tenderheart Bear", yearIntroduced: 1982 },
		{ name: "Wish Bear", yearIntroduced: 1982 },
	]);
});

it<LocalTestContext>("sorts on a numerical and a string field", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { name: {}, yearIntroduced: {} },
		order: [
			{ property: "yearIntroduced", direction: "desc" },
			{ property: "name", direction: "asc" },
		],
	});

	expect(result).toEqual([
		{ name: "Smart Heart Bear", yearIntroduced: 2005 },
		{ name: "Cheer Bear", yearIntroduced: 1982 },
		{ name: "Tenderheart Bear", yearIntroduced: 1982 },
		{ name: "Wish Bear", yearIntroduced: 1982 },
	]);
});
