import { expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTables, seed } from "../src/seed.js";
import { createSQLiteStore } from "../src/sqlite-store.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import { careBearConfig } from "./care-bear-config.js";

const db = Database(":memory:");
createTables(db, careBearSchema, careBearConfig);
seed(db, careBearSchema, careBearConfig, careBearData);
const store = createSQLiteStore(careBearSchema, db, careBearConfig);

it("fetches a single resource", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: {
			name: "name",
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches a single resource with its id", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: {
			id: "id",
			name: "name",
		},
	});

	expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
});

it("fetches a single resource without its id", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: {
			name: "name",
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches multiple resources", async () => {
	const result = await store.get({ type: "bears", select: ["id"] });
	const expected = ["1", "2", "3", "5"].map((id) => ({ id }));

	expect(result).toEqual(expected);
});

it("fetches a property from multiple resources", async () => {
	const result = await store.get({ type: "bears", select: { name: "name" } });
	const expected = [
		"Tenderheart Bear",
		"Cheer Bear",
		"Wish Bear",
		"Smart Heart Bear",
	].map((name) => ({ name }));

	expect(result).toEqual(expected);
});

it.only("fetches null for a nonexistent resource", async () => {
	const result = await store.get({ type: "bears", id: "6" });

	expect(result).toEqual(null);
});

it("fetches a single resource with a many-to-one relationship", async () => {
	const q = {
		type: "bears",
		id: "1",
		select: {
			home: { select: { id: "id" } },
		},
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({
		home: { id: "1" },
	});
});

it("fetches a single resource with a one-to-many relationship", async () => {
	const q = {
		type: "homes",
		id: "1",
		select: { residents: { select: { id: "id" } } },
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it("fetches a single resource with a one-to-many relationship and an implicit ref property", async () => {
	const q = {
		type: "homes",
		id: "1",
		select: { residents: {} },
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({
		residents: [
			{ type: "bears", id: "1" },
			{ type: "bears", id: "2" },
			{ type: "bears", id: "3" },
		],
	});
});

it("fetches a single resource with a subset of props", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: { id: "id", name: "name", furColor: "furColor" },
	});

	expect(result).toEqual({
		id: "1",
		name: "Tenderheart Bear",
		furColor: "tan",
	});
});

it("fetches a single resource with a renamed prop", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: { id: "id", color: "furColor" },
	});

	expect(result).toEqual({ id: "1", color: "tan" });
});

it("fetches a single resource with a subset of props on a relationship", async () => {
	const q = {
		type: "bears",
		id: "1",
		select: { home: { select: { caringMeter: "caringMeter" } } },
	} as const;

	const result = await store.get(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it("uses explicitly set id fields", async () => {
	const result = await store.get({
		type: "powers",
		id: "careBearStare",
	});

	expect(result).toEqual({ type: "powers", id: "careBearStare" });
});

it("always returns explicitly set id fields", async () => {
	const result = await store.get({
		type: "powers",
	});

	expect(result).toEqual([
		{ type: "powers", id: "careBearStare" },
		{ type: "powers", id: "makeWish" },
	]);
});

it("fetches a single resource with many-to-many relationship", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: { powers: {} },
	});

	expect(result).toEqual({ powers: [{ type: "powers", id: "careBearStare" }] });
});

it("fetches multiple subqueries of various types", async () => {
	const result = await store.get({
		type: "bears",
		id: "1",
		select: {
			home: {
				select: {
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

it("handles subqueries between the same type", async () => {
	const result = await store.get({
		type: "bears",
		select: {
			id: "id",
			bestFriend: {},
		},
	});

	expect(result).toEqual([
		{ id: "1", bestFriend: null },
		{ id: "2", bestFriend: { type: "bears", id: "3" } },
		{ id: "3", bestFriend: { type: "bears", id: "2" } },
		{ id: "5", bestFriend: null },
	]);
});

it.todo(
	"merges select when resource has different select from different parts of the query tree",
);

// it.skip("fails validation for invalid types", async () => {
// 	expect(async () => {
// 		await store.get({ type: "bearz", id: "1" });
// 	}).rejects.toThrowError();
// });

it.skip("fails validation for invalid top level props", async () => {
	await expect(async () => {
		await store.get({ type: "bears", id: "1", select: { koopa: {} } });
	}).rejects.toThrowError();
});
