import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "../src/memory-store";
import schema from "./fixtures/care-bears.schema.json" assert { type: "json" };
import { careBearData } from "./fixtures/care-bear-data.js";

type LocalTestContext = {
	store: any;
};

// Test Setup
beforeEach<LocalTestContext>((context) => {
	const store = MemoryStore(schema);
	store.seed(careBearData);

	context.store = store;
});

// Actual Tests

it.only<LocalTestContext>("fetches a single resource", async (context) => {
	const result = await context.store.get({
		type: "bears",
		id: "1",
		properties: {
			name: {},
		},
	});

	expect(result).toEqual({ name: "Tenderheart Bear" });
});

// it<LocalTestContext>("fetches multiple resources", async (context) => {
// 	const result = await context.store.get({ type: "bears" });
// 	const expected = ["1", "2", "3", "5"].map((id) => ({ id }));

// 	expect(result).toEqual(expected);
// });

// it<LocalTestContext>("fetches null for a nonexistent resource", async (context) => {
// 	const result = await context.store.get({ type: "bears", id: "6" });

// 	expect(result).toEqual(null);
// });

// it<LocalTestContext>("fetches a single resource specifying no subqueries desired", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		rels: {},
// 	});

// 	expect(result).toEqual({ id: "1" });
// });

// it<LocalTestContext>("fetches a single resource with a many-to-one relationship", async (context) => {
// 	const q = {
// 		type: "bears",
// 		id: "1",
// 		rels: { home: {} },
// 	};

// 	const result = await context.store.get(q);

// 	expect(result).toEqual({
// 		id: "1",
// 		home: { id: "1" },
// 	});
// });

// it<LocalTestContext>("a single resource with a one-to-many relationship", async (context) => {
// 	const q = {
// 		type: "homes",
// 		id: "1",
// 		rels: { bears: {} },
// 	};

// 	const result = await context.store.get(q);

// 	expect(result).toEqual({
// 		id: "1",
// 		bears: [{ id: "1" }, { id: "2" }, { id: "3" }],
// 	});
// });

// it<LocalTestContext>("fetches a single resource with a subset of props", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		props: ["name", "fur_color"],
// 	});

// 	expect(result).toEqual({ id: "1", name: "Tenderheart Bear", fur_color: "tan" });
// });

// it<LocalTestContext>("fetches a single resource with a subset of props on a relationship", async (context) => {
// 	const q = {
// 		type: "bears",
// 		id: "1",
// 		rels: { home: { props: ["caring_meter"] } },
// 	};

// 	const result = await context.store.get(q);

// 	t.like(result, { id: "1", home: { id: "1", caring_meter: 1 } });
// });

// it<LocalTestContext>("uses explicitly set id fields", async (context) => {
// 	const result = await context.store.get({
// 		type: "powers",
// 		id: "careBearStare",
// 	});

// 	expect(result).toEqual({ powerId: "careBearStare" });
// });

// it<LocalTestContext>("always returns explicitly set id fields", async (context) => {
// 	const result = await context.store.get({
// 		type: "powers",
// 	});

// 	expect(result).toEqual([{ powerId: "careBearStare" }, { powerId: "makeWish" }]);
// });

// it<LocalTestContext>("fetches a single resource with many-to-many relationship", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		rels: { powers: {} },
// 	});

// 	expect(result).toEqual({ id: "1", powers: [{ powerId: "careBearStare" }] });
// });

// it<LocalTestContext>("fetches multiple sub queries of various types", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		rels: {
// 			home: {
// 				rels: {
// 					bears: {},
// 				},
// 			},
// 			powers: {},
// 		},
// 	});

// 	expect(result).toEqual({
// 		id: "1",
// 		home: { id: "1", bears: [{ id: "1" }, { id: "2" }, { id: "3" }] },
// 		powers: [{ powerId: "careBearStare" }],
// 	});
// });

// it<LocalTestContext>("handles sub queries between the same type", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		rels: {
// 			best_friend: {},
// 		},
// 	});

// 	expect(result).toEqual([
// 		{ id: "1", best_friend: null },
// 		{ id: "2", best_friend: { id: "3" } },
// 		{ id: "3", best_friend: { id: "2" } },
// 		{ id: "5", best_friend: null },
// 	]);
// });

// it<LocalTestContext>("fetches all props", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		allProps: true,
// 	});

// 	expect(result).toEqual(omit(careBearData.bears[1], ["home", "best_friend", "powers"]));
// });

// it<LocalTestContext>("fetches all props except", async (context) => {
// 	const result = await context.store.get({
// 		type: "bears",
// 		id: "1",
// 		allProps: true,
// 		excludedProps: ["belly_badge"],
// 	});

// 	t.deepEqual(
// 		result,
// 		omit(careBearData.bears[1], ["belly_badge", "home", "best_friend", "powers"]),
// 	);
// });

// it<LocalTestContext>("fails validation for invalid types", async (context) => {
// 	const err = await t.throwsAsync(async () => {
// 		await context.store.get({ type: "bearz", id: "1" });
// 	});

// 	t.deepEqual(err.message, ERRORS.INVALID_GET_QUERY_SYNTAX);
// });

// it<LocalTestContext>("fails validation for invalid top level props", async (context) => {
// 	const err = await t.throwsAsync(async () => {
// 		await context.store.get({ type: "bears", id: "1", koopa: "troopa" });
// 	});

// 	t.deepEqual(err.message, ERRORS.INVALID_GET_QUERY_SYNTAX);
// });

// it<LocalTestContext>("validates without an id", async (context) => {
// 	const result = await context.store.get({ type: "bears" });
// 	t.assert(Array.isArray(result));
// });
