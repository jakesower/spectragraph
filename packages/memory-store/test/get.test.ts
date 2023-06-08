import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../src/memory-store";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bears.schema";

type LocalTestContext = {
	store: Store<typeof careBearSchema>;
};

// Test Setup
beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(careBearSchema);
	store.seed(careBearData);

	context.store = store;
});

it<LocalTestContext>("fetches a single resource", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			name: "name",
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches a single resource with its id", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			id: "id",
			name: "name",
		},
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches a single resource with its id implicitly", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
	});

	expect(result).toEqual({ type: "bears", id: "1" });
});

it<LocalTestContext>("fetches a single resource without its id", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			name: "name",
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches a single resource and maps property names", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			nombre: "name",
		},
	});

	expect(result).toEqual({ nombre: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches multiple resources", async (context) => {
	const result = await context.store.get({ type: "bears" });
	const expected = ["1", "2", "3", "5"].map((id) => ({ type: "bears", id }));

	expect(result).toEqual(expected);
});

it<LocalTestContext>("fetches a property from multiple resources", async (context) => {
	const result = await context.store.get({ type: "bears", properties: { name: "name" } });
	const expected = [
		"Tenderheart Bear",
		"Cheer Bear",
		"Wish Bear",
		"Smart Heart Bear",
	].map((name) => ({ name }));

	expect(result).toEqual(expected);
});

it<LocalTestContext>("fetches null for a nonexistent resource", async (context) => {
	const result = await context.store.get({ type: "bears", id: "6" });

	expect(result).toEqual(null);
});

it<LocalTestContext>("fetches a single resource with a many-to-one relationship", async (context) => {
	const q = {
		type: "bears",
		id: "1",
		properties: {
			home: {},
		},
	} as const;

	const result = await context.store.get(q);

	expect(result).toEqual({
		home: { type: "homes", id: "1" },
	});
});

it<LocalTestContext>("a single resource with a one-to-many relationship", async (context) => {
	const q = {
		type: "homes",
		id: "1",
		properties: { residents: {} },
	} as const;

	const result = await context.store.get(q);

	expect(result).toEqual({
		residents: [
			{ type: "bears", id: "1" },
			{ type: "bears", id: "2" },
			{ type: "bears", id: "3" },
		],
	});
});

it<LocalTestContext>("fetches a single resource with a subset of props", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: { id: "id", name: "name", furColor: "furColor" },
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear", furColor: "tan" });
});

it<LocalTestContext>("fetches a single resource with a subset of props on a relationship", async (context) => {
	const q = {
		type: "bears",
		id: "1",
		properties: { home: { properties: { caringMeter: "caringMeter" } } },
	} as const;

	const result = await context.store.get(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it<LocalTestContext>("uses explicitly set id fields", async (context) => {
	const result = await context.store.get({
		type: "powers",
		id: "careBearStare",
		properties: {
			powerId: "powerId",
		},
	});

	expect(result).toEqual({ powerId: "careBearStare" });
});

it<LocalTestContext>("returns refs when properties are not specified", async (context) => {
	const result = await context.store.get({
		type: "powers",
	});

	expect(result).toEqual([
		{ type: "powers", id: "careBearStare" },
		{ type: "powers", id: "makeWish" },
	]);
});

it<LocalTestContext>("fetches a single resource with many-to-many relationship", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: { powers: {} },
	});

	expect(result).toEqual({ powers: [{ type: "powers", id: "careBearStare" }] });
});

it<LocalTestContext>("fetches multiple subqueries of various types", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			home: {
				properties: {
					residents: {},
				},
			},
			powers: {},
		},
	});

	expect(result).toEqual({
		home: {
			residents: [
				{ type: "bears", id: "1" },
				{ type: "bears", id: "2" },
				{ type: "bears", id: "3" },
			],
		},
		powers: [{ type: "powers", id: "careBearStare" }],
	});
});

it<LocalTestContext>("handles subqueries between the same type", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: {
			id: "id",
			bestFriend: "bestFriend",
		},
	});

	expect(result).toEqual([
		{ id: "1", bestFriend: null },
		{ id: "2", bestFriend: { type: "bears", id: "3" } },
		{ id: "3", bestFriend: { type: "bears", id: "2" } },
		{ id: "5", bestFriend: null },
	]);
});

it<LocalTestContext>("fails validation for invalid types", async (context) => {
	expect(async () => {
		await context.store.get({ type: "bearz", id: "1" });
	}).rejects.toThrowError();
});

it<LocalTestContext>("fails validation for invalid top level props", async (context) => {
	await expect(async () => {
		await context.store.get({ type: "bears", id: "1", properties: { koopa: {} } });
	}).rejects.toThrowError();
});

it<LocalTestContext>("fetches nested fields with dot notation", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: {
			name: "name",
			residence: "home.name",
		},
	});

	expect(result).toEqual([
		{ name: "Tenderheart Bear", residence: "Care-a-Lot" },
		{ name: "Cheer Bear", residence: "Care-a-Lot" },
		{ name: "Wish Bear", residence: "Care-a-Lot" },
		{ name: "Smart Heart Bear", residence: null },
	]);
});

it<LocalTestContext>("fetches doubly nested fields with dot notation", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: {
			name: "name",
			friendsResidence: "bestFriend.home.name",
		},
	});

	expect(result).toEqual([
		{ name: "Tenderheart Bear", friendsResidence: null },
		{ name: "Cheer Bear", friendsResidence: "Care-a-Lot" },
		{ name: "Wish Bear", friendsResidence: "Care-a-Lot" },
		{ name: "Smart Heart Bear", friendsResidence: null },
	]);
});

it<LocalTestContext>("fetches mapped array data with dot notation", async (context) => {
	const result = await context.store.get({
		type: "homes",
		properties: {
			name: "name",
			residentNames: "residents.name",
		},
	});

	expect(result).toEqual([
		{
			name: "Care-a-Lot",
			residentNames: ["Tenderheart Bear", "Cheer Bear", "Wish Bear"],
		},
		{ name: "Forest of Feelings", residentNames: [] },
		{ name: "Earth", residentNames: [] },
	]);
});
