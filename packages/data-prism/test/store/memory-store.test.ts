import { expect, it, describe } from "vitest";
import { Schema } from "../../src/schema.js";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import careBearSchema from "../fixtures/care-bears.schema.json";
import { soccerSchema as rawSoccerSchema } from "../fixtures/soccer-schema.js";
import {
	createMemoryStore,
	NormalResourceTree,
} from "../../src/memory-store.js";
import { createValidator } from "../../src/validate.js";
import geojsonSchema from "../../schemas/geojson.schema.js/index.js";

const soccerSchema = rawSoccerSchema as Schema;

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

const createSoccerGraph = () =>
	({
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
	}) as any;

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

	it("works on an object with only a type and nothing required", () => {
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

	it("works with an valid type", () => {
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

	it("works with a null, non-required relationship", () => {
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

	it("works with a valid relationship", () => {
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

	it("works on an object with only a type and at least one required attribute", () => {
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

	it("works with an valid type", () => {
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

	it("works with a null, non-required relationship", () => {
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

	it("works with a valid relationship", () => {
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

	it("works with a missing required relationship", () => {
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

	it("works on an object with only a type and at least one required attribute", () => {
		const store = createMemoryStore(soccerSchema, {
			initialData: createSoccerGraph(),
		});
		expect(() => store.delete({ type: "teams", id: "1" })).not.toThrowError();
	});
});

describe("splice", () => {
	describe("without an id", () => {
		it("fails validation on an empty object", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() => store.splice({} as any)).toThrowError();
		});

		it("fails validation on an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() => store.splice({ type: "foo" })).toThrowError();
		});

		it("works on an object with only a type and nothing required", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() => store.splice({ type: "fields" })).not.toThrowError();
		});

		it("fails validation on an object with only a type and at least one required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() => store.splice({ type: "teams" })).toThrowError();
		});

		it("works and assigns an ID with an valid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "fields",
				attributes: { name: "Tempe Elementary B" },
			});

			expect(result.id).not.toEqual(null);
		});

		it("fails validation with an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
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
				store.splice({
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
				store.splice({
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
				store.splice({
					type: "games",
					attributes: { homeScore: 5, awayScore: 1 },
					relationships: {
						homeTeam: {} as any,
					},
				}),
			).toThrowError();
		});

		it("works with a null, non-required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});

			const result = store.splice({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});

			expect(result.id).not.toEqual(null);
			expect(result).toMatchObject({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
		});

		it("works with a valid new relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});

			const result = store.splice({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: {
							name: "Arizona Bay FC",
						},
						relationships: {
							homeField: { type: "fields", id: "1" },
						},
					},
				},
			});

			expect(result.id).not.toEqual(null);
			expect(
				(result.relationships.homeTeam as NormalResourceTree).id,
			).not.toEqual(null);
			expect(result).toMatchObject({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: {
							name: "Arizona Bay FC",
						},
						relationships: {
							homeField: { type: "fields", id: "1" },
						},
					},
				},
			});
		});

		it("works with a valid existing relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});

			const result = store.splice({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: "1",
						attributes: {
							name: "Arizona Bay FC",
						},
					},
				},
			});

			expect(result.id).not.toEqual(null);
			expect(result).toMatchObject({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: "1",
						attributes: {
							name: "Arizona Bay FC",
						},
					},
				},
			});

			expect(store.getOne("teams", "1")).not.toEqual(null);
		});

		it("fails validation with a missing required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
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
				store.splice({
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
				store.splice({
					type: "teams",
					attributes: { name: "Tempe Wave" },
					relationships: {
						homeField: null,
					},
				}),
			).toThrowError();
		});
	});

	describe("with an id", () => {
		it("works on an object with only a type and at least one required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "teams",
				id: "1",
			});

			expect(result).toEqual({
				type: "teams",
				id: "1",
				attributes: {
					name: "Arizona Bay FC",
				},
				relationships: {
					homeGames: [],
					awayGames: [],
					homeField: { type: "fields", id: "1" },
				},
			});
		});

		it("works with a valid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
					type: "fields",
					id: "1",
					attributes: { name: "Tempe Elementary B" },
				}),
			).not.toThrowError();
		});

		it("works with a valid type and a missing required attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "fields",
				id: "1",
			});

			expect(result).toEqual({
				type: "fields",
				id: "1",
				attributes: {
					name: "Beachside Park A",
				},
				relationships: { teams: [{ type: "teams", id: "1" }] },
			});
		});

		it("fails validation with an invalid type", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
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
				store.splice({
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
				store.splice({
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
				store.splice({
					type: "games",
					id: "1",
					attributes: { homeScore: 5, awayScore: 1 },
					relationships: {
						homeTeam: {} as any,
					},
				}),
			).toThrowError();
		});

		it("works with a null, non-required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});

			expect(result).toEqual({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
					awayTeam: null,
					referee: null,
				},
			});
		});

		it("works with a valid relationship, completing the inverse", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: "1",
						attributes: { name: "Scottsdale Surf" },
					},
				},
			});

			expect(result).toEqual({
				type: "games",
				id: "1",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: "1",
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeGames: [{ type: "games", id: "1" }],
							awayGames: [],
							homeField: { type: "fields", id: "1" },
						},
					},
					awayTeam: null,
					referee: null,
				},
			});
		});

		it("works with a missing required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
			});

			expect(result).toMatchObject({
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
			});
		});

		it("fails validation with a null, required relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
					type: "teams",
					id: "1",
					attributes: { name: "Tempe Wave" },
					relationships: { homeField: null },
				}),
			).toThrowError();
		});
	});

	describe("with nested resources", () => {
		it("works with a valid nested create relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
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

			expect((result.relationships?.referee as any).id).not.toEqual(null);
			expect(result).toMatchObject({
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
		});

		it("fails validation with a valid nested create relationship and missing attribute", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			expect(() =>
				store.splice({
					type: "games",
					attributes: { homeScore: 5, awayScore: 1 },
					relationships: {
						referee: {
							type: "referees",
						},
					},
				}),
			).toThrowError();
		});

		it("works with a valid nested update relationship", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					referee: {
						type: "referees",
						id: "1",
					},
				},
			});

			expect(result).toMatchObject({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
					awayTeam: null,
					referee: {
						type: "referees",
						id: "1",
					},
				},
			});
		});

		it("works with a doubly nested resource", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});

			const result = store.splice({
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

			expect(result).toMatchObject({
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
		});

		it("works with a nested resource with a ref", () => {
			const store = createMemoryStore(soccerSchema, {
				initialData: createSoccerGraph(),
			});
			const result = store.splice({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeField: { type: "fields", id: "1" },
						},
					},
				},
			});

			expect(result).toMatchObject({
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeField: { type: "fields", id: "1" },
						},
					},
				},
			});
		});
	});
});

describe("custom schemas", () => {
	const customSchema = structuredClone(soccerSchema);
	customSchema.resources.fields.attributes = {
		...customSchema.resources.fields.attributes,
		location: {
			type: "object",
			$ref: "https://data-prism.dev/schemas/geojson.schema.json#/definitions/Point",
		},
		constructedAt: {
			type: "date-time",
		},
		contactEmail: {
			type: "email",
		},
		timeActive: {
			type: "duration",
		},
		website: {
			type: "uri",
		},
		websitePath: {
			type: "uri-reference",
		},
	};

	it("passes with valid geojson", () => {
		const store = createMemoryStore(customSchema);
		store.create({
			type: "fields",
			attributes: {
				location: { type: "Point", coordinates: [102.0, 0.5] },
			},
		});
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
		const store = createMemoryStore(customSchema);
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					location: { type: "Point", coordinates: [-120, 0, "chicken butt"] },
				},
			}),
		).toThrowError();
	});

	it("passes with a valid datetime", () => {
		const store = createMemoryStore(customSchema);
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					constructedAt: new Date(),
				},
			}),
		).not.toThrowError();
	});

	it("fails with invalid datetime", () => {
		const store = createMemoryStore(customSchema);
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					constructedAt: "never",
				},
			}),
		).toThrowError();
	});

	it("passes with a valid duration", () => {
		const store = createMemoryStore(customSchema);
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					timeActive: "P3Y6M4DT12H30M5S",
				},
			}),
		).not.toThrowError();
	});

	it("fails with invalid duration", () => {
		const store = createMemoryStore(customSchema);
		expect(() =>
			store.create({
				type: "fields",
				attributes: {
					timeActive: "never",
				},
			}),
		).toThrowError();
	});

	describe("uri", () => {
		it("passes with a valid uri", () => {
			const store = createMemoryStore(customSchema);
			expect(() =>
				store.create({
					type: "fields",
					attributes: {
						website: "https://example.com/team",
					},
				}),
			).not.toThrowError();
		});

		it("fails with invalid uri", () => {
			const store = createMemoryStore(customSchema);
			expect(() =>
				store.create({
					type: "fields",
					attributes: {
						website: "never",
					},
				}),
			).toThrowError();
		});
	});

	describe("uri-reference", () => {
		it("passes with a valid uri reference", () => {
			const store = createMemoryStore(customSchema);
			expect(() =>
				store.create({
					type: "fields",
					attributes: {
						websitePath: "../gear",
					},
				}),
			).not.toThrowError();
		});
	});

	describe("email", () => {
		it("passes with a valid email", () => {
			const store = createMemoryStore(customSchema);
			expect(() =>
				store.create({
					type: "fields",
					attributes: {
						contactEmail: "jen@example.com",
					},
				}),
			).not.toThrowError();
		});

		it("fails with invalid uri", () => {
			const store = createMemoryStore(customSchema);
			expect(() =>
				store.create({
					type: "fields",
					attributes: {
						contactEmail: "some guy",
					},
				}),
			).toThrowError();
		});
	});
});
