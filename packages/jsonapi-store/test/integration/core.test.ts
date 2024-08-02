import { expect, it } from "vitest";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { createJSONAPIStore } from "../../src/jsonapi-store.js";
import { makeRequest } from "../helpers.js";

const store = createJSONAPIStore(careBearSchema, {
	baseURL: "http://127.0.0.1",
	transport: { get: makeRequest },
});

it("fetches a single resource", async () => {
	const result = await store.query({
		type: "bears",
		id: "1",
		select: ["name"],
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches a single resource with its id", async () => {
	const result = await store.query({
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
	const result = await store.query({
		type: "bears",
		id: "1",
		select: {
			name: "name",
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

it("fetches multiple resources", async () => {
	const result = await store.query({ type: "bears", select: ["id"] });
	const expected = ["1", "2", "3", "5"].map((id) => ({ id }));

	expect(result).toEqual(expected);
});

it("fetches a property from multiple resources", async () => {
	const result = await store.query({ type: "bears", select: { name: "name" } });
	const expected = [
		"Tenderheart Bear",
		"Cheer Bear",
		"Wish Bear",
		"Smart Heart Bear",
	].map((name) => ({ name }));

	expect(result).toEqual(expected);
});

it("fetches null for a nonexistent resource", async () => {
	const result = await store.query({ type: "bears", id: "6", select: ["id"] });

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

	const result = await store.query(q);

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

	const result = await store.query(q);

	expect(result).toEqual({
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it("fetches a single resource with a one-to-many relationship and an implicit ref property", async () => {
	const q = {
		type: "homes",
		id: "1",
		select: { residents: { select: ["id"] } },
	} as const;

	const result = await store.query(q);

	expect(result).toEqual({
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it("fetches a single resource with a subset of props", async () => {
	const result = await store.query({
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
	const result = await store.query({
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

	const result = await store.query(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it("uses explicitly set id fields", async () => {
	const result = await store.query({
		type: "powers",
		id: "careBearStare",
		select: ["powerId"],
	});

	expect(result).toEqual({ powerId: "careBearStare" });
});

it("fetches a single resource with many-to-many relationship", async () => {
	const result = await store.query({
		type: "bears",
		id: "1",
		select: { powers: { select: ["powerId"] } },
	});

	expect(result).toEqual({ powers: [{ powerId: "careBearStare" }] });
});

it("fetches multiple subqueries of various types", async () => {
	const result = await store.query({
		type: "bears",
		id: "1",
		select: {
			home: {
				select: {
					residents: { select: ["id"] },
				},
			},
			powers: { select: ["powerId"] },
		},
	});

	expect(result).toEqual({
		home: {
			residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
		},
		powers: [{ powerId: "careBearStare" }],
	});
});

it("handles subqueries between the same type", async () => {
	const result = await store.query({
		type: "bears",
		select: {
			id: "id",
			bestFriend: { select: ["id"] },
		},
	});

	expect(result).toEqual([
		{ id: "1", bestFriend: null },
		{ id: "2", bestFriend: { id: "3" } },
		{ id: "3", bestFriend: { id: "2" } },
		{ id: "5", bestFriend: null },
	]);
});

it("merges select when resource has different select from different parts of the query tree", async () => {
	const result = await store.query({
		type: "bears",
		select: {
			id: "id",
			bestFriend: { select: ["id", "name"] },
		},
	});

	expect(result).toEqual([
		{ id: "1", bestFriend: null },
		{ id: "2", bestFriend: { id: "3", name: "Wish Bear" } },
		{ id: "3", bestFriend: { id: "2", name: "Cheer Bear" } },
		{ id: "5", bestFriend: null },
	]);
});

it("fails validation for invalid types", async () => {
	expect(async () => {
		await store.query({ type: "bearz", id: "1" });
	}).rejects.toThrowError();
});

it("fails validation for invalid top level props", async () => {
	await expect(async () => {
		await store.query({ type: "bears", id: "1", select: { koopa: {} } });
	}).rejects.toThrowError();
});
