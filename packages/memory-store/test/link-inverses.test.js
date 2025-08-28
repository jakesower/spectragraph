import { expect, it, describe } from "vitest";
import { mapValues, omit } from "es-toolkit";
import { createMemoryStore } from "../src/index.js";
import {
	careBearSchema,
	careBearData,
} from "../../interface-tests/src/index.js";

describe("linkStoreInverses", () => {
	it("doesn't change anything for an already linked store", async () => {
		const store = createMemoryStore(careBearSchema, {
			initialData: careBearData,
		});

		// Get the initial state
		const initialBear = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		});

		// Link inverses (should be no-op)
		store.linkInverses();

		// Should be unchanged
		const afterLinkBear = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		});

		expect(afterLinkBear).toEqual(initialBear);
	});

	it("links a one-to-many relationship", async () => {
		// Create unlinked data where bears don't have home relationships
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: omit(bear.relationships, ["home"]),
		}));

		const store = createMemoryStore(careBearSchema, {
			initialData: {
				...careBearData,
				bears: unlinkedBears,
			},
		});

		// Verify bear initially has no home
		const bearBeforeLinking = await store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(bearBeforeLinking).toEqual({ name: "Tenderheart Bear" });

		// Link inverses
		store.linkInverses();

		// Now bear should have home relationship restored
		const bearAfterLinking = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		});

		expect(bearAfterLinking).toEqual({
			name: "Tenderheart Bear",
			home: { name: "Care-a-Lot" },
		});
	});

	it("links a many-to-one relationship", async () => {
		// Create unlinked data where homes don't have residents relationships
		const unlinkedHomes = mapValues(careBearData.homes, (home) => ({
			...home,
			relationships: omit(home.relationships, ["residents"]),
		}));

		const store = createMemoryStore(careBearSchema, {
			initialData: {
				...careBearData,
				homes: unlinkedHomes,
			},
		});

		// Verify home initially has no residents
		const homeBeforeLinking = await store.query({
			type: "homes",
			id: "1",
			select: ["name"],
		});

		expect(homeBeforeLinking).toEqual({ name: "Care-a-Lot" });

		// Link inverses
		store.linkInverses();

		// Now home should have residents relationship restored
		const homeAfterLinking = await store.query({
			type: "homes",
			id: "1",
			select: ["name", { residents: { select: ["name"] } }],
		});

		expect(homeAfterLinking.residents).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("links a many-to-many relationship", async () => {
		// Create unlinked data where bears don't have powers relationships
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: { ...bear.relationships, powers: undefined },
		}));

		const store = createMemoryStore(careBearSchema, {
			initialData: {
				...careBearData,
				bears: unlinkedBears,
			},
		});

		// Verify bear initially has no powers
		const bearBeforeLinking = await store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(bearBeforeLinking).toEqual({ name: "Tenderheart Bear" });

		// Link inverses
		store.linkInverses();

		// Now bear should have powers relationship restored
		const bearAfterLinking = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { powers: { select: ["name"] } }],
		});

		expect(bearAfterLinking).toEqual({
			name: "Tenderheart Bear",
			powers: [{ name: "Care Bear Stare" }],
		});
	});

	it("links multiple relationship types simultaneously", async () => {
		// Create data with multiple missing inverse relationships
		// Keep homes -> bears relationships, remove bears -> home relationships
		// Keep powers -> bears relationships, remove bears -> powers relationships
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: {
				// Remove home and powers, keep bestFriend if it exists
				...(bear.relationships.bestFriend && {
					bestFriend: bear.relationships.bestFriend,
				}),
			},
		}));

		const store = createMemoryStore(careBearSchema, {
			initialData: {
				...careBearData,
				bears: unlinkedBears,
			},
		});

		// Verify relationships are missing from bears side but homes still have residents
		const bearBefore = await store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});
		const homeBefore = await store.query({
			type: "homes",
			id: "1",
			select: ["name", { residents: { select: ["name"] } }],
		});

		expect(bearBefore).toEqual({ name: "Tenderheart Bear" });
		expect(homeBefore.residents).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
		]);

		// Link inverses
		store.linkInverses();

		// All relationships should be restored
		const bearAfter = await store.query({
			type: "bears",
			id: "1",
			select: [
				"name",
				{ home: { select: ["name"] } },
				{ powers: { select: ["name"] } },
			],
		});
		const homeAfter = await store.query({
			type: "homes",
			id: "1",
			select: ["name", { residents: { select: ["name"] } }],
		});

		expect(bearAfter).toEqual({
			name: "Tenderheart Bear",
			home: { name: "Care-a-Lot" },
			powers: [{ name: "Care Bear Stare" }],
		});

		expect(homeAfter.residents).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("works with empty store", async () => {
		const store = createMemoryStore(careBearSchema);

		// Should not throw
		expect(() => store.linkInverses()).not.toThrow();

		// Store should still be empty
		const bears = await store.query({ type: "bears", select: ["name"] });
		expect(bears).toEqual([]);
	});

	it("doesn't break when called on already correct data", async () => {
		const store = createMemoryStore(careBearSchema, {
			initialData: careBearData,
		});

		// Get initial state
		const bear1Before = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		});

		// Link inverses (should be no-op since data is already linked)
		store.linkInverses();

		// Should be exactly the same
		const bear1After = await store.query({
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		});

		expect(bear1After).toEqual(bear1Before);
		expect(bear1After).toEqual({
			name: "Tenderheart Bear",
			home: { name: "Care-a-Lot" },
		});
	});
});
