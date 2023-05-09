import { beforeEach, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTables, seed } from "../src/seed.js";
import { Store } from "@data-prism/store-core/store";
import { createSQLiteStore } from "../src/sqlite-store.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bears.schema.js";
import { careBearsConfig } from "./fixtures/care-bears-config.js";

const db = Database(":memory:");
createTables(db, careBearSchema, careBearsConfig);
seed(db, careBearSchema, careBearsConfig, careBearData);
const store = createSQLiteStore(careBearSchema, db);

it.only("fetches a single resource", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		properties: {
			name: {},
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches a single resource with its id", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		properties: {
			id: {},
			name: {},
		},
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
});

it("fetches a single resource with its id implicitly", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
	});

	expect(result).toEqual({ id: "1" });
});

it("fetches a single resource without its id", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		properties: {
			name: {},
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches multiple resources", async () => {
	const result = await store.get({ type: "bears" });
	const expected = ["1", "2", "3", "5"].map((id) => ({ id }));

	expect(result).toEqual(expected);
});

it("fetches a property from multiple resources", async () => {
	const result = await store.get({ type: "bears", properties: { name: {} } });
	const expected = [
		"Tenderheart Bear",
		"Cheer Bear",
		"Wish Bear",
		"Smart Heart Bear",
	].map((name) => ({ name }));

	expect(result).toEqual(expected);
});

it("fetches null for a nonexistent resource", async () => {
	const result = await store.get({ type: "bears", id: "6" });

	expect(result).toEqual(null);
});

it("fetches a single resource with a many-to-one relationship", async () => {
	const q = {
		type: "bears",
		id: "1",
		properties: {
			home: {},
		},
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({
		home: { id: "1" },
	});
});

it("a single resource with a one-to-many relationship", async () => {
	const q = {
		type: "homes",
		id: "1",
		properties: { residents: {} },
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it("fetches a single resource with a subset of props", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		properties: { id: {}, name: {}, furColor: {} },
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear", furColor: "tan" });
});

it("fetches a single resource with a subset of props on a relationship", async () => {
	const q = {
		type: "bears",
		id: "1",
		properties: { home: { properties: { caringMeter: {} } } },
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it("uses explicitly set id fields", async () => {
	const result = await store.get({
		type: "powers",
		id: "careBearStare",
	});

	expect(result).toEqual({ powerId: "careBearStare" });
});

it("always returns explicitly set id fields", async () => {
	const result = await store.get({
		type: "powers",
	});

	expect(result).toEqual([{ powerId: "careBearStare" }, { powerId: "makeWish" }]);
});

it("fetches a single resource with many-to-many relationship", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		properties: { powers: {} },
	});

	expect(result).toEqual({ powers: [{ powerId: "careBearStare" }] });
});

it("fetches multiple subqueries of various types", async () => {
	const result = await store.get({
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

it("handles subqueries between the same type", async () => {
	const result = await store.get({
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

// it("fails validation for invalid types", async () => {
// 	expect(async () => {
// 		await store.get({ type: "bearz", id: "1" });
// 	}).rejects.toThrowError();
// });

it("fails validation for invalid top level props", async () => {
	await expect(async () => {
		await store.get({ type: "bears", id: "1", properties: { koopa: {} } });
	}).rejects.toThrowError();
});
