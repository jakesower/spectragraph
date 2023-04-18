import { beforeEach, describe, expect, it } from "vitest";
import { tabularize } from "../src/tree.js";
import { careBearSchema as schema } from "./fixtures/care-bears.schema.js";

// Test Setup
// beforeEach((context) => {
// });

describe("tabularize", () => {
	it("handles a single resource", () => {
		const query = { type: "bears", properties: { id: {} } };
		const tree = { id: "1" };

		expect(tabularize(schema, query, tree)).toEqual([tree]);
	});

	it("can navigate a single to-one relationship", () => {
		const query = {
			type: "bears",
			id: "1",
			properties: { id: {}, home: { properties: { id: {} } } },
		};
		const tree = { id: "1", home: { id: "1" } };

		expect(tabularize(schema, query, tree)).toEqual([{ id: "1", "home.id": "1" }]);
	});

	it("can navigate a single to-many relationship from a single resource", () => {
		const query = {
			type: "bears",
			id: "1",
			properties: { id: {}, powers: { properties: { powerId: {} } } },
		};
		const tree = {
			id: "1",
			powers: [{ powerId: "careBearStare" }, { powerId: "makeWish" }],
		};

		expect(tabularize(schema, query, tree)).toEqual([
			{ id: "1", "powers.powerId": "careBearStare" },
			{ id: "1", "powers.powerId": "makeWish" },
		]);
	});

	it("can navigate a single to-many relationship from multiple resources", () => {
		const query = {
			type: "bears",
			properties: { id: {}, powers: { properties: { powerId: {} } } },
		};
		const tree = [
			{
				id: "1",
				powers: [{ powerId: "careBearStare" }, { powerId: "makeWish" }],
			},
			{
				id: "2",
				powers: [{ powerId: "careBearStare" }, { powerId: "makeWish" }],
			},
		];

		expect(tabularize(schema, query, tree)).toEqual([
			{ id: "1", "powers.powerId": "careBearStare" },
			{ id: "1", "powers.powerId": "makeWish" },
			{ id: "2", "powers.powerId": "careBearStare" },
			{ id: "2", "powers.powerId": "makeWish" },
		]);
	});
});
