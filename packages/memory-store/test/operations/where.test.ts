import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../../src/memory-store";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bears.schema";

type LocalTestContext = {
	store: Store<typeof careBearSchema>;
};

beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(careBearSchema);
	store.seed(careBearData);

	context.store = store;
});

it<LocalTestContext>("filters on a property equality constraint", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { id: "id", name: "name" },
		where: { name: "Cheer Bear" },
	});

	expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
});

it<LocalTestContext>("filters on a property that is not returned from properties", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: { id: "id" },
		where: { name: "Cheer Bear" },
	});

	expect(result).toEqual([{ id: "2" }]);
});

it<LocalTestContext>("filters on multiple property equality where", async (context) => {
	const result = await context.store.get({
		type: "homes",
		where: {
			caringMeter: 1,
			isInClouds: false,
		},
	});

	expect(result).toEqual([{ type: "homes", id: "2" }]);
});

it<LocalTestContext>("filters using $eq operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $eq: 2005 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it<LocalTestContext>("filters using $gt operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $gt: 2000 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it<LocalTestContext>("filters using $lt operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $lt: 2000 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it<LocalTestContext>("filters using $lte operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $lte: 2000 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it<LocalTestContext>("filters using $gte operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $gte: 2005 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it<LocalTestContext>("filters using $in 1", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2005, 2022] },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it<LocalTestContext>("filters using $in 2", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2022] },
		},
	});

	expect(result).toEqual([]);
});

it<LocalTestContext>("filters using $ne operator", async (context) => {
	const result = await context.store.get({
		type: "bears",
		where: {
			yearIntroduced: { $ne: 2005 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it<LocalTestContext>("filters related resources", async (context) => {
	const result = await context.store.get({
		type: "powers",
		id: "careBearStare",
		properties: {
			powerId: "powerId",
			wielders: {
				where: {
					yearIntroduced: { $gt: 2000 },
				},
			},
		},
	});

	expect(result).toEqual({
		powerId: "careBearStare",
		wielders: [{ type: "bears", id: "5" }],
	});
});
