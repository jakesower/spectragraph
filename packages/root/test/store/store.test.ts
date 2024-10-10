import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import { careBearSchema } from "../fixtures/care-bear-schema.js";
import { createMemoryStore } from "../../src/store.js";

const singleBearWithHomeTree = {
	id: "bear-abc-123",
	name: "Tenderheart Bear",
	date_introduced: "1982-02-04",
	belly_badge: "red heart with pink outline",
	fur_color: "tan",
	home: {
		id: "home-def-234",
		name: "Care-a-Lot",
		location: "Kingdom of Caring",
		caring_meter: 1,
		is_in_clouds: true,
	},
	powers: ["power-fgh-345", "power-ijk-456"],
};

const barePowersTrees = [
	{
		powerId: "power-fgh-345",
		name: "Care Bear Stare",
	},
	{ powerId: "power-ijk-456", name: "Something Else" },
];

describe("queryTree core", () => {
	it("fetches appropriately on an empty store", async () => {
		const store = createMemoryStore(careBearSchema);
		const result = store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual(null);
	});

	it("fetches appropriately on an empty store with multiple resources", async () => {
		const store = createMemoryStore(careBearSchema);
		const result = store.query({
			type: "bears",
			select: ["name"],
		});

		expect(result).toEqual([]);
	});

	it("fetches a single resource", async () => {
		const store = createMemoryStore(careBearSchema, careBearData);

		const result = store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("can merge data into the store", async () => {
		const store = createMemoryStore(careBearSchema);
		store.merge({ bears: careBearData.bears });

		const result = store.query({
			type: "bears",
			select: ["name"],
		});

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});

	it("can merge tree data into the store", async () => {
		const store = createMemoryStore(careBearSchema);
		store.mergeTree("bears", singleBearWithHomeTree);

		const result = store.query({
			type: "bears",
			id: "bear-abc-123",
			select: ["name", { home: { select: ["name"] } }],
		});

		expect(result).toEqual({
			name: "Tenderheart Bear",
			home: { name: "Care-a-Lot" },
		});
	});

	it("can merge multiple trees", async () => {
		const store = createMemoryStore(careBearSchema);
		store.mergeTree("bears", singleBearWithHomeTree);
		store.mergeTrees("powers", barePowersTrees);

		const result = store.query({
			type: "bears",
			id: "bear-abc-123",
			select: ["name", { powers: { select: ["name"] } }],
		});

		expect(result).toEqual({
			name: "Tenderheart Bear",
			powers: [{ name: "Care Bear Stare" }, { name: "Something Else" }],
		});
	});
});
