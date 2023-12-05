import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../../src/memory-store";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bear-schema.js";

type LocalTestContext = {
	store: Store<typeof careBearSchema>;
};

beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(careBearSchema);
	store.setState(careBearData);

	context.store = store;
});

it<LocalTestContext>("sorts on a numeric field", async (context) => {
	const result = await context.store.get({
		type: "bears",
		select: { name: "name", yearIntroduced: "yearIntroduced" },
		order: { yearIntroduced: "desc" },
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
		select: { name: "name", yearIntroduced: "yearIntroduced" },
		order: { name: "asc" },
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
		select: { name: "name", yearIntroduced: "yearIntroduced" },
		order: [{ yearIntroduced: "desc" }, { name: "asc" }],
	});

	expect(result).toEqual([
		{ name: "Smart Heart Bear", yearIntroduced: 2005 },
		{ name: "Cheer Bear", yearIntroduced: 1982 },
		{ name: "Tenderheart Bear", yearIntroduced: 1982 },
		{ name: "Wish Bear", yearIntroduced: 1982 },
	]);
});
