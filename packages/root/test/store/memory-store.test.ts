import { expect, it, describe } from "vitest";
import { Schema } from "../../src/schema.js";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import { careBearSchema } from "../fixtures/care-bear-schema.js";
import { soccerSchema as rawSoccerSchema } from "../fixtures/soccer-schema.js";
import { createMemoryStore } from "../../src/memory-store.js";
import { createValidator } from "../../src/validate.js";
import geojsonSchema from "../../schemas/geojson.schema.json";

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

const soccerSchema = rawSoccerSchema as Schema;

describe("create validation", () => {
	it("fails validation on an empty object", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.create({} as any)).toThrowError();
	});

	it("fails validation on an invalid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.create({ type: "foo" })).toThrowError();
	});

	it("fails validation with a nonexistant attribute", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "fields",
				attributes: { chicken: "butt" },
			}),
		).toThrowError();
	});

	it("passes validation on an object with only a type and nothing required", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.create({ type: "fields" })).not.toThrowError();
	});

	it("fails validation on an object with only a type and at least one required attribute", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.create({ type: "teams" })).toThrowError();
	});

	it("passes validation with an valid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "fields",
				attributes: { name: "Tempe Elementary B" },
			}),
		).not.toThrowError();
	});

	it("fails validation with an invalid attribute type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "fields",
				attributes: { name: 5 },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid minimum", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "games",
				attributes: { homeScore: 5, awayScore: -1 },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid pattern", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "fields",
				attributes: { name: "my field" },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid related resource", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {} as any,
				},
			}),
		).toThrowError();
	});

	it("passes validation with a null, non-required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			}),
		).not.toThrowError();
	});

	it("passes validation with a valid relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		store.create({
			type: "games",
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: { type: "teams", id: "1" },
			},
		});
		expect(() =>
			store.create({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "1" },
				},
			}),
		).not.toThrowError();
	});

	it("fails validation with a missing required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "teams",
				attributes: { name: "Tempe Wave" },
			}),
		).toThrowError();
	});

	it("fails validation with an empty relationships object without the required relationships", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {},
			}),
		).toThrowError();
	});

	it("fails validation with a null, required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.create({
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {
					homeField: null,
				},
			}),
		).toThrowError();
	});
});

describe("update validation", () => {
	it("fails validation on an empty object", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.update({} as any)).toThrowError();
	});

	it("fails validation on an invalid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.update({ type: "foo" } as any)).toThrowError();
	});

	it("failes validation on an object with only a type and no id", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "fields",
			} as any),
		).toThrowError();
	});

	it("passes validation on an object with only a type and at least one required attribute", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "teams",
				id: "1",
			}),
		).not.toThrowError();
	});

	it("passes validation with an valid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "fields",
				id: "1",
				attributes: { name: "Tempe Elementary B" },
			}),
		).not.toThrowError();
	});

	it("fails validation with an invalid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "fields",
				id: "1",
				attributes: { name: 5 },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid minimum", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: -1 },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid pattern", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "fields",
				id: "1",
				attributes: { name: "my field" },
			}),
		).toThrowError();
	});

	it("fails validation with an invalid related resource", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {} as any,
				},
			}),
		).toThrowError();
	});

	it("passes validation with a null, non-required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			}),
		).not.toThrowError();
	});

	it("passes validation with a valid relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "1" },
				},
			}),
		).not.toThrowError();
	});

	it("passes validation with a missing required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
			}),
		).not.toThrowError();
	});

	it("fails validation with a null, required relationship", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.update({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
				relationships: { homeField: null },
			}),
		).toThrowError();
	});
});

describe("delete validation", () => {
	it("fails validation on an empty object", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.delete({} as any)).toThrowError();
	});

	it("fails validation on an invalid type", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.delete({ type: "foo" } as any)).toThrowError();
	});

	it("fails validation on an object with only a type and no id", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() =>
			store.delete({
				type: "fields",
			} as any),
		).toThrowError();
	});

	it("passes validation on an object with only a type and at least one required attribute", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.delete({ type: "teams", id: "1" })).not.toThrowError();
	});
});

// TODO: for testing splice
describe.skip("resource tree validation", () => {
	describe("without an id", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		it("fails validation on an empty object", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {} as any);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation on an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, { type: "foo" });
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation on an object with only a type and nothing required", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, { type: "fields" });
			expect(result.length).toEqual(0);
		});

		it("fails validation on an object with only a type and at least one required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, { type: "teams" });
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with an valid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "fields",
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "fields",
				attributes: { name: 5 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid minimum", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: -1 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid pattern", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "fields",
				attributes: { name: "my field" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid related resource", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {} as any,
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a null, non-required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: "abc",
					},
				},
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with a missing required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an empty relationships object without the required relationships", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with a null, required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {
					homeField: null,
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("without an id", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		it("passes validation on an object with only a type and at least one required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "teams",
				id: "1",
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "fields",
				id: "1",
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid type and a missing required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "fields",
				id: "1",
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "fields",
				id: "1",
				attributes: { name: 5 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid minimum", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: -1 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid pattern", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "fields",
				id: "1",
				attributes: { name: "my field" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid related resource", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {} as any,
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a null, non-required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "abc" },
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a missing required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with a null, required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.update({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
				relationships: { homeField: null },
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("with nested resources", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		it("passes validation with a valid nested create relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					referee: {
						type: "referees",
						attributes: {
							name: "Serafina Pekkala",
						},
					},
				},
			});

			expect(result.length).toEqual(0);
		});

		it("fails validation with a valid nested create relationship and missing attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					referee: {
						type: "referees",
					},
				},
			});

			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a valid nested update relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					referee: {
						type: "referees",
						id: "3",
					},
				},
			});

			expect(result.length).toEqual(0);
		});

		it("passes validation with a doubly nested resource", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeField: {
								type: "fields",
							},
						},
					},
				},
			});

			expect(result.length).toEqual(0);
		});

		it("passes validation with a nested resource with a ref", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = validateResourceTree(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeField: {
								type: "fields",
								id: "3",
							},
						},
					},
				},
			});

			expect(result.length).toEqual(0);
		});
	});
});

describe("custom keywords", () => {
	const locationSchema = structuredClone(soccerSchema);
	locationSchema.resources.fields.attributes.location = {
		type: "object",
		$ref: "https://example.com/schemas/geojson.schema.json#/definitions/Point",
	};

	const validator = createValidator();
	validator.addSchema(geojsonSchema);

	it("passes with valid geojson", () => {
		const store = createMemoryStore(locationSchema, { validator });
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					location: { type: "Point", coordinates: [102.0, 0.5] },
				},
			}),
		).not.toThrowError();
	});

	it("fails with invalid geojson", () => {
		const store = createMemoryStore(locationSchema, { validator });
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					location: { type: "Point", coordinates: [-120, 0, "chicken butt"] },
				},
			}),
		).toThrowError();
	});
});
