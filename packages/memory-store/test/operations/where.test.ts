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

it<LocalTestContext>("filters on a property equality constraint", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: { name: "Cheer Bear" },
	});

	expect(result).toEqual([{ id: "2" }]);
});

it.skip<LocalTestContext>("filters on multiple property equality where", async (context) => {
	const result = await context.store.get({
		type: "homes",
		where: {
			caring_meter: 1,
			is_in_clouds: false,
		},
	});

	expect(result).toEqual([{ id: "2" }]);
});

it.skip<LocalTestContext>("filters using $eq operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $eq: 2005 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it.skip<LocalTestContext>("filters using $gt operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $gt: 2000 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it.skip<LocalTestContext>("filters using $lt operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $lt: 2000 },
		},
	});

	expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
});

it.skip<LocalTestContext>("filters using $lte operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $lte: 2000 },
		},
	});

	expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
});

it.skip<LocalTestContext>("filters using $gte operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $gte: 2005 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it.skip<LocalTestContext>("filters using $in 1", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2005, 2022] },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it.skip<LocalTestContext>("filters using $in 2", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2022] },
		},
	});

	expect(result).toEqual([]);
});

it.skip<LocalTestContext>("filters using $ne operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $ne: 2005 },
		},
	});

	expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
});

it.skip<LocalTestContext>("filters related resources", async (context) => {
	const result = await context.store.get({
		type: "powers",
		id: "careBearStare",
		relationships: {
			bears: {
				where: {
					yearIntroduced: { $gt: 2000 },
				},
			},
		},
	});

	expect(result).toEqual({ id: "careBearStare", bears: [{ id: "5" }] });
});
