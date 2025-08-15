import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { soccerSchema as rawSoccerSchema } from "../fixtures/soccer-schema.js";
import { createMemoryStore } from "../../src/memory-store.js";
import { createValidator } from "@data-prism/core";
import geojsonSchema from "../fixtures/geojson.schema.json" with { type: "json" };

const soccerSchema = rawSoccerSchema;

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

const createSoccerGraph = () => ({
	fields: {
		1: {
			attributes: {
				name: "Beachside Park A",
			},
			relationships: {
				teams: [{ type: "teams", id: "1" }],
			},
		},
	},
	games: {
		1: {
			attributes: { homeScore: 0, awayScore: 1 },
			relationships: {
				homeTeam: null,
				awayTeam: null,
				referee: null,
			},
		},
	},
	referees: {
		1: {
			attributes: { name: "The Enforcer" },
			relationships: {
				games: [],
			},
		},
	},
	teams: {
		1: {
			attributes: {
				name: "Arizona Bay FC",
			},
			relationships: {
				homeGames: [],
				awayGames: [],
				homeField: { type: "fields", id: "1" },
			},
		},
	},
});

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
		const store = createMemoryStore(careBearSchema, {
			initialData: careBearData,
		});

		const result = store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	describe("* notation", () => {
		it("fetches a single resource with * as a string", async () => {
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
				type: "bears",
				id: "1",
				select: "*",
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			});
		});

		it("fetches a single resource with * in an array", async () => {
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
				type: "bears",
				id: "1",
				select: ["name", "*"],
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			});
		});

		it("fetches a single resource with * in an object", async () => {
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
				type: "bears",
				id: "1",
				select: { "*": true },
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			});
		});
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

});
