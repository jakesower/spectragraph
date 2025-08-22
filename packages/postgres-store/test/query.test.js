import { describe, it, expect, beforeEach } from "vitest";
import { getClient } from "./get-client.js";
import { createPostgresStore } from "../src/postgres-store.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearConfig } from "./fixtures/care-bear-config.js";
import { reset } from "../scripts/seed.js";

describe("Query Tests", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);
		
		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
		});
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

it("fetches a single resource with a geography column", async () => {
	const result = await store.query({
		type: "homes",
		id: "1",
		select: {
			location: "location",
		},
	});

	expect(result).toEqual({
		location: {
			type: "Point",
			coordinates: [-119.557320248, 46.820255868],
		},
	});
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
	};

	const result = await store.query(q);

	expect(result).toEqual({
		home: { id: "1" },
	});
});

it("fetches a single resource with a one-to-many relationship", async () => {
	const q = {
		type: "homes",
		id: "1",
		select: { name: "name", residents: { select: { id: "id" } } },
	};

	const result = await store.query(q);

	expect(result).toEqual({
		name: "Care-a-Lot",
		residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
	});
});

it("fetches a single resource with a one-to-many relationship and an implicit ref property", async () => {
	const q = {
		type: "homes",
		id: "1",
		select: { residents: { select: ["id"] } },
	};

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
	};

	const result = await store.query(q);

	expect(result).toEqual({ home: { caringMeter: 1 } });
});

it("uses explicitly set id fields", async () => {
	const result = await store.query({
		type: "powers",
		id: "careBearStare",
		select: ["powerId", "name"],
	});

	expect(result).toEqual({ powerId: "careBearStare", name: "Care Bear Stare" });
});

it("uses explicitly set id fields without fetching the ID", async () => {
	const result = await store.query({
		type: "powers",
		id: "careBearStare",
		select: ["name"],
	});

	expect(result).toEqual({ name: "Care Bear Stare" });
});

it("uses explicitly set id fields without fetching the ID when the ID is not an attribute", async () => {
	const result = await store.query({
		type: "companions",
		id: "1",
		select: ["name"],
	});

	expect(result).toEqual({ name: "Brave Heart Lion" });
});

it("fetches a single resource with many-to-many relationship", async () => {
	const result = await store.query({
		type: "bears",
		id: "1",
		select: { powers: { select: ["powerId"] } },
	});

	expect(result).toEqual({ powers: [{ powerId: "careBearStare" }] });
});

it("fetches a single resource with many-to-many relationship when it has no related resources", async () => {
	const result = await store.query({
		type: "powers",
		id: "transform",
		select: { name: "name", wielders: { select: ["name"] } },
	});

	expect(result).toEqual({ name: "Transform", wielders: [] });
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

it("disallows invalid attribute names", async () => {
	await expect(async () => {
		await store.query({
			type: "bears",
			select: ["lol"],
		});
	}).rejects.toThrowError();
});

// it("disallows invalid attribute paths", async () => {
// 	await expect(async () => {
// 		store.query({
// 			type: "bears",
// 			select: [{ homeSize: "home.size" }],
// 		});
// 	}).rejects.toThrowError();
// });

});