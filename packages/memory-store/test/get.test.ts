import { beforeEach, expect, it } from "vitest";
import { Store, createMemoryStore } from "../src/memory-store";
import schema from "./fixtures/care-bears.schema.json" assert { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";

type LocalTestContext = {
	store: Store;
};

// Test Setup
beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(schema);
	store.seed(careBearData);

	context.store = store;
});

it<LocalTestContext>("fetches a single resource", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			name: {},
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches a single resource with its id", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			id: {},
			name: {},
		},
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches a single resource with its id implicitly", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
	});

	expect(result).toEqual({ id: "1" });
});

it<LocalTestContext>("fetches a single resource without its id", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			name: {},
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it<LocalTestContext>("fetches multiple resources", async (context) => {
	const result = await context.store.get({ type: "bears" });
	const expected = ["1", "2", "3", "5"].map((id) => ({ id }));

	expect(result).toEqual(expected);
});

it<LocalTestContext>("fetches a property from multiple resources", async (context) => {
	const result = await context.store.get({ type: "bears", properties: { name: {} } });
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
	};

	const result = await context.store.get(q);

	expect(result).toEqual({
		home: { id: "1" },
	});
});

it<LocalTestContext>("a single resource with a one-to-many relationship", async (context) => {
	const q = {
		type: "homes",
		id: "1",
		properties: { residents: {} },
	};

	const result = await context.store.get(q);

	expect(result).toEqual({
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it<LocalTestContext>("fetches a single resource with a subset of props", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: { id: {}, name: {}, furColor: {} },
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear", furColor: "tan" });
});

it<LocalTestContext>("fetches a single resource with a subset of props on a relationship", async (context) => {
	const q = {
		type: "bears",
		id: "1",
		properties: { home: { properties: { caringMeter: {} } } },
	};

	const result = await context.store.get(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it<LocalTestContext>("uses explicitly set id fields", async (context) => {
	const result = await context.store.get({
		type: "powers",
		id: "careBearStare",
	});

	expect(result).toEqual({ powerId: "careBearStare" });
});

it<LocalTestContext>("always returns explicitly set id fields", async (context) => {
	const result = await context.store.get({
		type: "powers",
	});

	expect(result).toEqual([{ powerId: "careBearStare" }, { powerId: "makeWish" }]);
});

it<LocalTestContext>("fetches a single resource with many-to-many relationship", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: { powers: {} },
	});

	expect(result).toEqual({ powers: [{ powerId: "careBearStare" }] });
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
		home: { residents: [{ id: "1" }, { id: "2" }, { id: "3" }] },
		powers: [{ powerId: "careBearStare" }],
	});
});

it<LocalTestContext>("handles subqueries between the same type", async (context) => {
	const result = await context.store.get({
		type: "bears",
		properties: {
			id: {},
			bestFriend: {},
		},
	});

	expect(result).toEqual([
		{ id: "1", bestFriend: null },
		{ id: "2", bestFriend: { id: "3" } },
		{ id: "3", bestFriend: { id: "2" } },
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
