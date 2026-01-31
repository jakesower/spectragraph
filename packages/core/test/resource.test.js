import { describe, expect, it } from "vitest";
import {
	createValidator,
	validateQueryResult,
	validateCreateResource,
	validateDeleteResource,
	validateMergeResource,
	validateUpdateResource,
	buildNormalResource,
	mergeNormalResources,
	normalizeResource,
} from "../src/resource.js";
import { soccerSchema, geojsonSchema } from "../interface-tests/src/index.js";

const geojsonDPSchema = structuredClone(soccerSchema);
geojsonDPSchema.resources.fields.attributes.location = {
	type: "object",
	$ref: "https://geojson.org/schema/Geometry.json",
};

const geojsonValidator = createValidator({
	ajvSchemas: [geojsonSchema],
});

describe("create validation", () => {
	it("fails validation on an empty object", () => {
		const result = validateCreateResource(soccerSchema, {});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation on an invalid type", () => {
		const result = validateCreateResource(soccerSchema, { type: "foo" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with a nonexistant attribute", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "fields",
			attributes: { chicken: "butt" },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation on an object with only a type and nothing required", () => {
		const result = validateCreateResource(soccerSchema, { type: "fields" });
		expect(result.length).toEqual(0);
	});

	it("fails validation on an object with only a type and at least one required attribute", () => {
		const result = validateCreateResource(soccerSchema, { type: "teams" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation with an valid type", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "fields",
			attributes: { name: "Tempe Elementary B" },
		});
		expect(result.length).toEqual(0);
	});

	it("fails validation with an invalid type", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "fields",
			attributes: { name: 5 },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid minimum", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "games",
			attributes: { homeScore: 5, awayScore: -1 },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid pattern", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "fields",
			attributes: { name: "my field" },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid related resource", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "games",
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: {},
			},
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation with a null, non-required relationship", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "games",
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: null,
			},
		});
		expect(result.length).toEqual(0);
	});

	it("passes validation with a valid relationship", () => {
		const result = validateCreateResource(soccerSchema, {
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
		const result = validateCreateResource(soccerSchema, {
			type: "teams",
			attributes: { name: "Tempe Wave" },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an empty relationships object without the required relationships", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "teams",
			attributes: { name: "Tempe Wave" },
			relationships: {},
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with a null, required relationship", () => {
		const result = validateCreateResource(soccerSchema, {
			type: "teams",
			attributes: { name: "Tempe Wave" },
			relationships: {
				homeField: null,
			},
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("validates with remote schemas being used as $refs in a schema with valid values", () => {
		const result = validateCreateResource(
			geojsonDPSchema,
			{
				type: "fields",
				attributes: {
					location: {
						type: "Point",
						coordinates: [102.0, 0.5],
					},
				},
			},
			{ validator: geojsonValidator },
		);

		expect(result.length).toEqual(0);
	});

	it("fails to validate with remote schemas being used as $refs in a schema with invalid values", () => {
		const result = validateCreateResource(
			geojsonDPSchema,
			{
				type: "fields",
				attributes: {
					location: { type: "Chicken Butt" },
				},
			},
			{ validator: geojsonValidator },
		);

		expect(result.length).toBeGreaterThan(0);
	});
});

describe("update validation", () => {
	it("fails validation on an empty object", () => {
		const result = validateUpdateResource(soccerSchema, {});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation on an invalid type", () => {
		const result = validateUpdateResource(soccerSchema, { type: "foo" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("failes validation on an object with only a type and no id", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "fields",
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation on an object with only a type and at least one required attribute", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "teams",
			id: "1",
		});
		expect(result.length).toEqual(0);
	});

	it("passes validation on an object with a type, and integer ID", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: 1,
		});
		expect(result.length).toEqual(0);
	});

	it("passes validation on an object with a type, and string ID where there should be an integer", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: "1",
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation with an valid type", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "fields",
			id: "1",
			attributes: { name: "Tempe Elementary B" },
		});
		expect(result.length).toEqual(0);
	});

	it("fails validation with an invalid type", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "fields",
			id: "1",
			attributes: { name: 5 },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid minimum", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: "1",
			attributes: { homeScore: 5, awayScore: -1 },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid pattern", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "fields",
			id: "1",
			attributes: { name: "my field" },
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation with an invalid related resource", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: "1",
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: {},
			},
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation with a null, non-required relationship", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: 1,
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: null,
			},
		});
		expect(result.length).toEqual(0);
	});

	it("passes validation with a valid relationship", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "games",
			id: 1,
			attributes: { homeScore: 5, awayScore: 1 },
			relationships: {
				homeTeam: { type: "teams", id: "abc" },
			},
		});
		expect(result.length).toEqual(0);
	});

	it("passes validation with a missing required relationship", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "teams",
			id: "1",
			attributes: { name: "Tempe Wave" },
		});
		expect(result.length).toEqual(0);
	});

	it("fails validation with a null, required relationship", () => {
		const result = validateUpdateResource(soccerSchema, {
			type: "teams",
			id: "1",
			attributes: { name: "Tempe Wave" },
			relationships: { homeField: null },
		});
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("delete validation", () => {
	it("fails validation on an empty object", () => {
		const result = validateDeleteResource(soccerSchema, {});
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation on an invalid type", () => {
		const result = validateDeleteResource(soccerSchema, { type: "foo" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("failes validation on an object with only a type and no id", () => {
		const result = validateDeleteResource(soccerSchema, {
			type: "fields",
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("passes validation on an object with only a type and at least one required attribute", () => {
		const result = validateDeleteResource(soccerSchema, {
			type: "teams",
			id: "1",
		});
		expect(result.length).toEqual(0);
	});
});

describe("resource merge validation", () => {
	describe("without an id", () => {
		it("fails validation on an empty object", () => {
			const result = validateMergeResource(soccerSchema, {});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation on an invalid type", () => {
			const result = validateMergeResource(soccerSchema, { type: "foo" });
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation on an object with only a type and nothing required", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "fields",
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation on an object with only a type and at least one required attribute", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "teams",
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with an valid type", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "fields",
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with an invalid type", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "fields",
				attributes: { name: 5 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid minimum", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: -1 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid pattern", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "fields",
				attributes: { name: "my field" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid related resource", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {},
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a null, non-required relationship", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid relationship", () => {
			const result = validateMergeResource(soccerSchema, {
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
			const result = validateMergeResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an empty relationships object without the required relationships", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with a null, required relationship", () => {
			const result = validateMergeResource(soccerSchema, {
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
		it("passes validation on an object with only a type and at least one required attribute", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "teams",
				id: "1",
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid type", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "fields",
				id: "1",
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid type and a missing required attribute", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "fields",
				id: "1",
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with an invalid type", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "fields",
				id: "1",
				attributes: { name: 5 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid minimum", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 1,
				attributes: { homeScore: 5, awayScore: -1 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid pattern", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "fields",
				id: "1",
				attributes: { name: "my field" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid related resource", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 1,
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {},
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a null, non-required relationship", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 1,
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid relationship", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 1,
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "abc" },
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a missing required relationship", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with a null, required relationship", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "teams",
				id: "1",
				attributes: { name: "Tempe Wave" },
				relationships: { homeField: null },
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("with nested resources", () => {
		it("passes validation with a valid nested create relationship", () => {
			const result = validateMergeResource(soccerSchema, {
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
			const result = validateMergeResource(soccerSchema, {
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
			const result = validateMergeResource(soccerSchema, {
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
			const result = validateMergeResource(soccerSchema, {
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
			const result = validateMergeResource(soccerSchema, {
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

describe("validateQueryResult", () => {
	// graph tests get validated with this, so we test invalid cases here
	// (except one to make sure we're not getting invalid errors)

	it("succeeds on a valid structure", () => {
		const query = { type: "fields", id: "1", select: ["name"] };
		const result = validateQueryResult(soccerSchema, query, { name: "Hi" });
		expect(result.length).toEqual(0);
	});

	it("fails validation on an invalid structure", () => {
		const result = validateQueryResult(
			soccerSchema,
			{ type: "fields", select: ["name"] },
			"chicken butt",
		);
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation when expecting multiple resources", () => {
		const result = validateQueryResult(
			soccerSchema,
			{ type: "fields", select: ["name"] },
			{ name: "Bob" },
		);
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation when expecting a single resource", () => {
		const result = validateQueryResult(
			soccerSchema,
			{ type: "fields", id: "1", select: ["name"] },
			[],
		);
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation on an invalid string type", () => {
		const result = validateQueryResult(
			soccerSchema,
			{ type: "fields", id: "1", select: ["name"] },
			{ name: 5 },
		);
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails based on a JSON schema definition in an attribute", () => {
		const query = { type: "fields", id: "1", select: ["name"] };
		const result = validateQueryResult(soccerSchema, query, { name: "hi" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("fails validation on a defined $ref", () => {
		const result = validateQueryResult(
			geojsonDPSchema,
			{ type: "fields", id: "1", select: ["location"] },
			{ location: { hi: "there" } },
			{ validator: geojsonValidator },
		);
		expect(result.length).toBeGreaterThan(0);
	});

	it("allows null for a selected to-one relationship", () => {
		const query = {
			type: "games",
			id: "1",
			select: {
				attendance: "attendance",
				referee: { select: ["name"] },
			},
		};
		const result = validateQueryResult(soccerSchema, query, {
			attendance: 1000,
			referee: null,
		});
		expect(result.length).toEqual(0);
	});

	it("allows undefined for an attribute", () => {
		const query = {
			type: "games",
			id: "1",
			select: ["attendance", "homeScore"],
		};
		const result = validateQueryResult(soccerSchema, query, {
			attendance: 1000,
			homeScore: undefined,
		});
		expect(result.length).toEqual(0);
	});

	it("fails validation when result contains extra attributes not in select", () => {
		const query = {
			type: "games",
			id: "1",
			select: ["attendance"],
		};
		const result = validateQueryResult(soccerSchema, query, {
			attendance: 1000,
			homeScore: 3,
		});
		expect(result.length).toBeGreaterThan(0);
	});

	it("allows empty array for to-many relationships", () => {
		const query = {
			type: "teams",
			id: "1",
			select: {
				name: "name",
				homeGames: { select: ["attendance"] },
			},
		};
		const result = validateQueryResult(soccerSchema, query, {
			name: "Team A",
			homeGames: [],
		});
		expect(result.length).toEqual(0);
	});

	it("allows null to-one relationships in array results", () => {
		const query = {
			type: "games",
			select: {
				attendance: "attendance",
				referee: { select: ["name"] },
			},
		};
		const result = validateQueryResult(soccerSchema, query, [
			{ attendance: 1000, referee: { name: "Ref 1" } },
			{ attendance: 2000, referee: null },
		]);
		expect(result.length).toEqual(0);
	});

	it("validates non-empty to-many relationships with nested objects", () => {
		const query = {
			type: "teams",
			id: "1",
			select: {
				name: "name",
				homeGames: { select: ["attendance"] },
			},
		};
		const result = validateQueryResult(soccerSchema, query, {
			name: "Team A",
			homeGames: [{ attendance: 1000 }, { attendance: 2000 }],
		});
		expect(result.length).toEqual(0);
	});

	describe("group query results", () => {
		it("validates simple group by with select", () => {
			const query = {
				type: "games",
				group: {
					by: ["attendance"],
					select: ["attendance"],
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{ attendance: 1000 },
				{ attendance: 2000 },
			]);
			expect(result.length).toEqual(0);
		});

		it("validates group with aggregates", () => {
			const query = {
				type: "games",
				group: {
					by: "attendance",
					aggregates: { total: { $count: null } },
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{ attendance: 1000, total: 2 },
				{ attendance: 2000, total: 1 },
			]);
			expect(result.length).toEqual(0);
		});

		it("validates group with select and aggregates combined", () => {
			const query = {
				type: "games",
				group: {
					by: ["attendance"],
					select: { count: "attendance" },
					aggregates: { total: { $count: null } },
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{ count: 1000, total: 2 },
				{ count: 2000, total: 1 },
			]);
			expect(result.length).toEqual(0);
		});

		it("validates grand total query (by: [])", () => {
			const query = {
				type: "games",
				group: {
					by: [],
					aggregates: {
						totalGames: { $count: null },
						avgAttendance: { $mean: { $pluck: "attendance" } },
					},
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{
					totalGames: 4,
					avgAttendance: 1500,
				},
			]);
			expect(result.length).toEqual(0);
		});

		it("validates nested group query results", () => {
			const query = {
				type: "games",
				group: {
					by: "attendance",
					aggregates: { gameCount: { $count: null } },
					group: {
						by: "gameCount",
						aggregates: { attendanceLevels: { $count: null } },
					},
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{ gameCount: 2, attendanceLevels: 1 },
				{ gameCount: 1, attendanceLevels: 2 },
			]);
			expect(result.length).toEqual(0);
		});

		it("fails validation when group result is missing aggregate field", () => {
			const query = {
				type: "games",
				group: {
					by: "attendance",
					aggregates: { total: { $count: null } },
				},
			};
			const result = validateQueryResult(soccerSchema, query, [
				{ attendance: 1000 }, // missing 'total'
			]);
			expect(result.length).toBeGreaterThan(0);
		});
	});
});

describe("normalizeResource", () => {
	describe("ref object detection", () => {
		it("throws helpful error when passed a ref object instead of resource data", () => {
			const ref = { type: "teams", id: "team-123" };

			expect(() =>
				normalizeResource(soccerSchema, "teams", ref),
			).toThrow(/ref object/i);
		});

		it("throws helpful error when passed a ref with only type and id properties", () => {
			const ref = { type: "fields", id: "field-456" };

			expect(() =>
				normalizeResource(soccerSchema, "fields", ref),
			).toThrow(/ref object.*instead of resource data/i);
		});

		it("does not throw when passed valid resource data with type attribute", () => {
			// This should NOT throw - it's a valid resource with a "type" attribute
			// (e.g., from a schema where "type" is an actual attribute, not just the resource type)
			const resource = {
				id: "game-123",
				homeScore: 2,
				awayScore: 1,
			};

			expect(() =>
				normalizeResource(soccerSchema, "games", resource),
			).not.toThrow();
		});

		it("does not throw when passed a resource with many properties including type and id", () => {
			// Should not throw - has more than just type and id
			const resource = {
				type: "teams", // This would be a top-level property in the raw data
				id: "team-123",
				name: "Test Team",
				homeField: { type: "fields", id: "field-1" },
			};

			expect(() =>
				normalizeResource(soccerSchema, "teams", resource),
			).not.toThrow();
		});
	});
});

describe("buildNormalResource", () => {
	describe("basic functionality", () => {
		it("creates a resource with all defaults applied when no attributes provided", () => {
			const result = buildNormalResource(soccerSchema, "fields", {});

			expect(result).toEqual({
				type: "fields",
				id: undefined,
				attributes: {
					id: undefined,
					surface: "grass",
					capacity: 5000,
					amenities: [],
				},
				relationships: {
					teams: [],
				},
			});
		});

		it("creates a resource with defaults and provided attributes merged", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				name: "Stadium Field",
			});

			expect(result).toEqual({
				type: "fields",
				id: undefined,
				attributes: {
					id: undefined,
					name: "Stadium Field",
					surface: "grass",
					capacity: 5000,
					amenities: [],
				},
				relationships: {
					teams: [],
				},
			});
		});

		it("provided attributes override defaults", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				surface: "turf",
				capacity: 8000,
			});

			expect(result.attributes.surface).toBe("turf");
			expect(result.attributes.capacity).toBe(8000);
		});

		it("creates a resource with provided ID", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				id: "custom-id",
			});

			expect(result.id).toBe("custom-id");
			expect(result.attributes.id).toBe("custom-id");
		});
	});

	describe("different data types", () => {
		it("applies string defaults", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
			});

			expect(result.attributes.status).toBe("scheduled");
		});

		it("applies integer defaults", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
			});

			expect(result.attributes.attendance).toBe(0);
		});

		it("applies boolean defaults", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				name: "Test Team",
				homeField: { type: "fields", id: "field-1" },
			});

			expect(result.attributes.active).toBe(true);
		});

		it("applies multiple types of defaults simultaneously", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				name: "FC Tidal Wave",
			});

			expect(result.attributes).toMatchObject({
				homeColor: "blue", // string default
				awayColor: "white", // string default
				founded: 2000, // integer default
				active: true, // boolean default
			});
		});

		it("applies array defaults", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				name: "Test Field",
			});

			expect(result.attributes.amenities).toEqual([]);
		});

		it("applies nested object defaults", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 1,
				awayScore: 0,
			});

			expect(result.attributes.bookings).toEqual({
				homeTeam: [],
				awayTeam: [],
			});
		});

		it("applies nested object defaults within an array", () => {
			const result = buildNormalResource(soccerSchema, "referees", {
				certifications: [{ certifyingBody: "SCRA" }],
			});

			expect(result.attributes.certifications).toEqual([
				{
					certifyingBody: "SCRA",
					grade: 9,
				},
			]);
		});

		it("applies nested object defaults within an object", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				sponsors: { orangeDrink: { name: "Orange Drink" } },
			});

			expect(result.attributes.sponsors).toEqual({
				FIFA: { amount: 50 },
				orangeDrink: { name: "Orange Drink", amount: 10000000 },
			});
		});

		it("applies patternProperties defaults based on property name patterns", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				sponsors: {
					local_bakery: { name: "Local Bakery" },
					global_tech: { name: "Global Tech Corp" },
					randomSponsor: { name: "Random Sponsor" },
				},
			});

			expect(result.attributes.sponsors).toEqual({
				FIFA: { amount: 50 },
				local_bakery: { name: "Local Bakery", amount: 5000, region: "local" },
				global_tech: {
					name: "Global Tech Corp",
					amount: 25000000,
					region: "global",
				},
				randomSponsor: { name: "Random Sponsor", amount: 10000000 },
			});
		});
	});

	describe("relationship handling", () => {
		it("initializes empty array for many cardinality relationships", () => {
			const result = buildNormalResource(soccerSchema, "fields", {});

			expect(result.relationships.teams).toEqual([]);
		});

		it("initializes null for one cardinality relationships", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
			});

			expect(result.relationships.homeTeam).toBeNull();
			expect(result.relationships.awayTeam).toBeNull();
			expect(result.relationships.referee).toBeNull();
		});

		it("preserves provided relationships", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
				homeTeam: { type: "teams", id: "team-1" },
			});

			expect(result.relationships.homeTeam).toEqual({
				type: "teams",
				id: "team-1",
			});
			expect(result.relationships.awayTeam).toBeNull();
		});
	});

	describe("ID attribute handling", () => {
		it("uses default id attribute when not specified in schema", () => {
			const result = buildNormalResource(soccerSchema, "fields", {});

			expect(result.attributes.id).toBeUndefined();
			expect(result.id).toBeUndefined();
		});

		it("uses custom idAttribute from schema", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
			});

			// games has idAttribute: "id" in schema
			expect(result.attributes.id).toBeUndefined();
			expect(result.id).toBe(result.attributes.id);
		});

		it("handles provided ID correctly", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				id: "custom-field-id",
			});

			expect(result.id).toBe("custom-field-id");
			expect(result.attributes.id).toBe("custom-field-id");
		});
	});

	describe("edge cases", () => {
		it("handles empty attributes object", () => {
			const result = buildNormalResource(soccerSchema, "fields", {});

			expect(result.attributes).toMatchObject({
				surface: "grass",
				capacity: 5000,
				amenities: [],
			});
		});

		it("handles empty relationships object", () => {
			const result = buildNormalResource(soccerSchema, "fields", {});

			expect(result.relationships.teams).toEqual([]);
		});

		it("handles resource types without defaults", () => {
			// Create a minimal resource for a type that originally had no defaults
			const result = buildNormalResource(soccerSchema, "referees", {
				name: "Test Referee",
			});

			expect(result.attributes.name).toBe("Test Referee");
			expect(result.attributes.experience).toBe(0);
			expect(result.attributes.certifications).toEqual([]);
		});

		it("handles null/undefined attribute values correctly", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				name: null,
				surface: undefined,
			});

			// null should be preserved, undefined should get default
			expect(result.attributes.name).toBeNull();
			expect(result.attributes.surface).toBe("grass");
		});

		it("handles provided arrays overriding array defaults", () => {
			const result = buildNormalResource(soccerSchema, "fields", {
				amenities: ["parking", "restrooms"],
			});

			expect(result.attributes.amenities).toEqual(["parking", "restrooms"]);
		});

		it("handles provided objects overriding nested object defaults", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
				bookings: {
					homeTeam: [
						{
							card: "yellow",
							reason: "unsporting behavior",
							playerNumber: 3,
						},
					],
					awayTeam: [{ card: "red", reason: "DOGSO", playerNumber: 5 }],
				},
			});

			expect(result.attributes.bookings).toEqual({
				homeTeam: [
					{ card: "yellow", reason: "unsporting behavior", playerNumber: 3 },
				],
				awayTeam: [{ card: "red", reason: "DOGSO", playerNumber: 5 }],
			});
		});

		it("handles partial object properties with nested defaults", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 3,
				awayScore: 2,
				bookings: {
					homeTeam: [
						{
							card: "yellow",
							reason: "unsporting behavior",
							playerNumber: 3,
						},
					],
					// awayTeam should get default
				},
			});

			// Should merge provided properties with defaults
			expect(result.attributes.bookings).toEqual({
				homeTeam: [
					{ card: "yellow", reason: "unsporting behavior", playerNumber: 3 },
				],
				awayTeam: [], // default merged in
			});
		});
	});

	describe("validation integration", () => {
		it("creates valid resources that pass validation", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				name: "Valid Team",
				homeField: { type: "fields", id: "field-1" },
			});

			const validationResult = validateCreateResource(soccerSchema, result);
			expect(validationResult).toHaveLength(0);
		});

		it("respects required attributes from schema", () => {
			const result = buildNormalResource(soccerSchema, "games", {
				homeScore: 2,
				awayScore: 1,
			});

			// homeScore and awayScore are required and provided
			expect(result.attributes.homeScore).toBe(2);
			expect(result.attributes.awayScore).toBe(1);
			// defaults should still be applied
			expect(result.attributes.status).toBe("scheduled");
		});
	});

	describe("includeRelationships option", () => {
		it("includes relationship defaults by default", () => {
			const result = buildNormalResource(soccerSchema, "teams", {
				name: "Test Team",
				homeField: { type: "fields", id: "field-1" },
			});

			// Should have default empty arrays for many cardinality
			expect(result.relationships.homeGames).toEqual([]);
			expect(result.relationships.awayGames).toEqual([]);
		});

		it("omits relationship defaults when includeRelationships is false", () => {
			const result = buildNormalResource(
				soccerSchema,
				"teams",
				{
					name: "Test Team",
					homeField: { type: "fields", id: "field-1" },
				},
				{ includeRelationships: false },
			);

			// Should not have homeGames or awayGames at all
			expect(result.relationships.homeGames).toBeUndefined();
			expect(result.relationships.awayGames).toBeUndefined();
			// But should have explicitly provided relationship
			expect(result.relationships.homeField).toEqual({
				type: "fields",
				id: "field-1",
			});
		});

		it("omits all relationships when includeRelationships is false and none provided", () => {
			const result = buildNormalResource(
				soccerSchema,
				"fields",
				{
					name: "Test Field",
				},
				{ includeRelationships: false },
			);

			// Should have no relationships at all
			expect(result.relationships).toEqual({});
		});

		it("preserves explicit null/empty array when includeRelationships is false", () => {
			const result = buildNormalResource(
				soccerSchema,
				"games",
				{
					homeScore: 2,
					awayScore: 1,
					homeTeam: null,
					awayTeam: null,
				},
				{ includeRelationships: false },
			);

			// Explicitly provided null should be preserved
			expect(result.relationships.homeTeam).toBeNull();
			expect(result.relationships.awayTeam).toBeNull();
			// But referee should be undefined (not provided, not defaulted)
			expect(result.relationships.referee).toBeUndefined();
		});

		it("preserves explicit relationships even when includeRelationships is false", () => {
			const result = buildNormalResource(
				soccerSchema,
				"games",
				{
					homeScore: 2,
					awayScore: 1,
					homeTeam: { type: "teams", id: "team-1" },
					awayTeam: { type: "teams", id: "team-2" },
				},
				{ includeRelationships: false },
			);

			// Explicitly provided relationships should be preserved
			expect(result.relationships.homeTeam).toEqual({
				type: "teams",
				id: "team-1",
			});
			expect(result.relationships.awayTeam).toEqual({
				type: "teams",
				id: "team-2",
			});
			// But referee should be undefined (not provided)
			expect(result.relationships.referee).toBeUndefined();
		});

		it("still applies attribute defaults when includeRelationships is false", () => {
			const result = buildNormalResource(
				soccerSchema,
				"fields",
				{
					name: "Test Field",
				},
				{ includeRelationships: false },
			);

			// Attribute defaults should still be applied
			expect(result.attributes.surface).toBe("grass");
			expect(result.attributes.capacity).toBe(5000);
			expect(result.attributes.amenities).toEqual([]);
		});

		it("works with nested object attribute defaults when includeRelationships is false", () => {
			const result = buildNormalResource(
				soccerSchema,
				"games",
				{
					homeScore: 3,
					awayScore: 2,
				},
				{ includeRelationships: false },
			);

			// Nested object defaults should still work
			expect(result.attributes.bookings).toEqual({
				homeTeam: [],
				awayTeam: [],
			});
			// But relationships should be undefined
			expect(result.relationships.homeTeam).toBeUndefined();
			expect(result.relationships.awayTeam).toBeUndefined();
		});
	});
});

describe("mergeNormalResources", () => {
	describe("basic functionality", () => {
		it("merges two resources of the same type with different attributes", () => {
			const left = {
				type: "fields",
				id: "field-1",
				attributes: { name: "Field A", surface: "grass" },
				relationships: {},
			};
			const right = {
				type: "fields",
				id: "field-1",
				attributes: { capacity: 5000, amenities: ["parking"] },
				relationships: {},
			};

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "fields",
				id: "field-1",
				attributes: {
					name: "Field A",
					surface: "grass",
					capacity: 5000,
					amenities: ["parking"],
				},
				relationships: {},
			});
		});

		it("merges two resources where right overrides left attributes", () => {
			const left = {
				type: "teams",
				id: "team-1",
				attributes: { name: "Original Name", founded: 2000 },
				relationships: {},
			};
			const right = {
				type: "teams",
				id: "team-1",
				attributes: { name: "Updated Name", active: true },
				relationships: {},
			};

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "teams",
				id: "team-1",
				attributes: {
					name: "Updated Name", // right overrides left
					founded: 2000, // from left
					active: true, // from right
				},
				relationships: {},
			});
		});

		it("merges resources with different relationships", () => {
			const left = {
				type: "games",
				attributes: {},
				relationships: {
					homeTeam: { type: "teams", id: "team-1" },
				},
			};
			const right = {
				type: "games",
				attributes: {},
				relationships: {
					awayTeam: { type: "teams", id: "team-2" },
				},
			};

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "games",
				id: undefined,
				attributes: {},
				relationships: {
					homeTeam: { type: "teams", id: "team-1" },
					awayTeam: { type: "teams", id: "team-2" },
				},
			});
		});

		it("merges resources where right overrides left relationships", () => {
			const left = {
				type: "teams",
				attributes: {},
				relationships: {
					homeField: { type: "fields", id: "field-1" },
				},
			};
			const right = {
				type: "teams",
				attributes: {},
				relationships: {
					homeField: { type: "fields", id: "field-2" }, // overrides left
				},
			};

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "teams",
				id: undefined,
				attributes: {},
				relationships: {
					homeField: { type: "fields", id: "field-2" },
				},
			});
		});
	});

	describe("ID handling", () => {
		it("uses left ID when right has no ID", () => {
			const left = { type: "fields", id: "left-id", attributes: {} };
			const right = { type: "fields", attributes: {} };

			const result = mergeNormalResources(left, right);

			expect(result.id).toBe("left-id");
		});

		it("uses right ID when left has no ID", () => {
			const left = { type: "fields", attributes: {} };
			const right = { type: "fields", id: "right-id", attributes: {} };

			const result = mergeNormalResources(left, right);

			expect(result.id).toBe("right-id");
		});

		it("uses shared ID when both have the same ID", () => {
			const left = { type: "fields", id: "same-id", attributes: {} };
			const right = { type: "fields", id: "same-id", attributes: {} };

			const result = mergeNormalResources(left, right);

			expect(result.id).toBe("same-id");
		});

		it("leaves ID undefined when both resources have no ID", () => {
			const left = { type: "fields", attributes: {} };
			const right = { type: "fields", attributes: {} };

			const result = mergeNormalResources(left, right);

			expect(result.id).toBeUndefined();
		});
	});

	describe("optional properties handling", () => {
		it("handles undefined attributes gracefully", () => {
			const left = { type: "fields", id: "1" };
			const right = { type: "fields", attributes: { name: "Test" } };

			const result = mergeNormalResources(left, right);

			expect(result.attributes).toEqual({ name: "Test" });
		});

		it("handles undefined relationships gracefully", () => {
			const left = { type: "fields", id: "1" };
			const right = {
				type: "fields",
				relationships: { teams: [] },
			};

			const result = mergeNormalResources(left, right);

			expect(result.relationships).toEqual({ teams: [] });
		});

		it("handles both resources having undefined attributes and relationships", () => {
			const left = { type: "fields", id: "1" };
			const right = { type: "fields" };

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "fields",
				id: "1",
				attributes: {},
				relationships: {},
			});
		});
	});

	describe("error handling", () => {
		it("throws error when resource types don't match", () => {
			const left = { type: "fields", attributes: {} };
			const right = { type: "teams", attributes: {} };

			expect(() => mergeNormalResources(left, right)).toThrow();
		});

		it("throws error when IDs are different and both are present", () => {
			const left = { type: "fields", id: "field-1", attributes: {} };
			const right = { type: "fields", id: "field-2", attributes: {} };

			expect(() => mergeNormalResources(left, right)).toThrow();
		});

		it("includes error message for type mismatch", () => {
			const left = { type: "fields", attributes: {} };
			const right = { type: "teams", attributes: {} };

			expect(() => mergeNormalResources(left, right)).toThrow();
		});

		it("includes error message for ID mismatch", () => {
			const left = { type: "fields", id: "field-1", attributes: {} };
			const right = { type: "fields", id: "field-2", attributes: {} };

			expect(() => mergeNormalResources(left, right)).toThrow();
		});
	});

	describe("complex scenarios", () => {
		it("merges complex nested attributes", () => {
			const left = {
				type: "games",
				attributes: {
					bookings: {
						homeTeam: [{ card: "yellow", playerNumber: 1 }],
					},
				},
			};
			const right = {
				type: "games",
				attributes: {
					bookings: {
						awayTeam: [{ card: "red", playerNumber: 5 }],
					},
				},
			};

			const result = mergeNormalResources(left, right);

			expect(result.attributes.bookings).toEqual({
				awayTeam: [{ card: "red", playerNumber: 5 }],
			});
		});

		it("merges array relationships", () => {
			const left = {
				type: "fields",
				relationships: {
					teams: [{ type: "teams", id: "team-1" }],
				},
			};
			const right = {
				type: "fields",
				relationships: {
					teams: [
						{ type: "teams", id: "team-2" },
						{ type: "teams", id: "team-3" },
					],
				},
			};

			const result = mergeNormalResources(left, right);

			expect(result.relationships.teams).toEqual([
				{ type: "teams", id: "team-2" },
				{ type: "teams", id: "team-3" },
			]);
		});

		it("handles null values in attributes", () => {
			const left = {
				type: "games",
				attributes: { status: "scheduled", notes: null },
			};
			const right = {
				type: "games",
				attributes: { status: "completed", attendance: 1000 },
			};

			const result = mergeNormalResources(left, right);

			expect(result.attributes).toEqual({
				status: "completed",
				notes: null,
				attendance: 1000,
			});
		});

		it("handles null values in relationships", () => {
			const left = {
				type: "games",
				relationships: {
					homeTeam: null,
					referee: { type: "referees", id: "ref-1" },
				},
			};
			const right = {
				type: "games",
				relationships: { awayTeam: { type: "teams", id: "team-2" } },
			};

			const result = mergeNormalResources(left, right);

			expect(result.relationships).toEqual({
				homeTeam: null,
				referee: { type: "referees", id: "ref-1" },
				awayTeam: { type: "teams", id: "team-2" },
			});
		});
	});

	describe("real-world use cases", () => {
		it("merges partial updates with existing resource data", () => {
			const existing = {
				type: "teams",
				id: "team-1",
				attributes: {
					name: "Original Team",
					founded: 2000,
					active: true,
					homeColor: "blue",
					awayColor: "white",
				},
				relationships: {
					homeField: { type: "fields", id: "field-1" },
				},
			};
			const update = {
				type: "teams",
				id: "team-1",
				attributes: {
					name: "Updated Team Name",
					founded: 2001, // corrected founding year
				},
			};

			const result = mergeNormalResources(existing, update);

			expect(result).toEqual({
				type: "teams",
				id: "team-1",
				attributes: {
					name: "Updated Team Name", // updated
					founded: 2001, // updated
					active: true, // preserved
					homeColor: "blue", // preserved
					awayColor: "white", // preserved
				},
				relationships: {
					homeField: { type: "fields", id: "field-1" }, // preserved
				},
			});
		});

		it("merges default values with user input", () => {
			const defaults = {
				type: "fields",
				attributes: {
					surface: "grass",
					capacity: 5000,
					amenities: [],
				},
				relationships: {
					teams: [],
				},
			};
			const userInput = {
				type: "fields",
				id: "custom-field",
				attributes: {
					name: "Custom Field Name",
					capacity: 8000, // override default
				},
			};

			const result = mergeNormalResources(defaults, userInput);

			expect(result).toEqual({
				type: "fields",
				id: "custom-field",
				attributes: {
					name: "Custom Field Name",
					surface: "grass", // from defaults
					capacity: 8000, // overridden
					amenities: [], // from defaults
				},
				relationships: {
					teams: [], // from defaults
				},
			});
		});
	});
});

describe("numeric ID support", () => {
	describe("create validation", () => {
		it("passes validation with a numeric ID", () => {
			const result = validateCreateResource(soccerSchema, {
				type: "games",
				id: 123,
				attributes: { homeScore: 1, awayScore: 2 },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with a numeric ID in relationships whith a string ID", () => {
			const result = validateCreateResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: 456,
					},
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a proper numeric ID in relationships", () => {
			const result = validateCreateResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Surf" },
				relationships: {
					homeGames: [{ type: "games", id: 123 }],
					homeField: { type: "fields", id: "hi" },
				},
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("update validation", () => {
		it("passes validation with a numeric ID", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 789,
				attributes: { homeScore: 1, awayScore: 1 },
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a proper string ID in relationships", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 100,
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "200" },
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a proper numeric ID in relationships", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "teams",
				id: "100",
				attributes: { name: "Tempe Surf" },
				relationships: {
					homeGames: [{ type: "games", id: 123 }],
					homeField: { type: "fields", id: "hi" },
				},
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("delete validation", () => {
		it("passes validation with a numeric ID", () => {
			const result = validateDeleteResource(soccerSchema, {
				type: "games",
				id: 999,
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with a numeric ID where a string is expected", () => {
			const result = validateDeleteResource(soccerSchema, {
				type: "teams",
				id: 999,
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with a string ID where a number is expected", () => {
			const result = validateDeleteResource(soccerSchema, {
				type: "games",
				id: "999",
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("merge validation", () => {
		it("passes validation with a numeric ID for update", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "games",
				id: 42,
				attributes: { homeScore: 1, awayScore: 2 },
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with numeric ID in nested relationships", () => {
			const result = validateMergeResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {
						type: "teams",
						id: 300,
						attributes: { name: "Scottsdale Surf" },
						relationships: {
							homeField: {
								type: "fields",
								id: 400,
							},
						},
					},
				},
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("mergeNormalResources with numeric IDs", () => {
		it("merges resources with numeric IDs", () => {
			const left = {
				type: "fields",
				id: 1,
				attributes: { name: "Field A" },
				relationships: {},
			};
			const right = {
				type: "fields",
				id: 1,
				attributes: { capacity: 5000 },
				relationships: {},
			};

			const result = mergeNormalResources(left, right);

			expect(result).toEqual({
				type: "fields",
				id: 1,
				attributes: {
					name: "Field A",
					capacity: 5000,
				},
				relationships: {},
			});
		});

		it("throws error when numeric IDs are different", () => {
			const left = { type: "fields", id: 1, attributes: {} };
			const right = { type: "fields", id: 2, attributes: {} };

			expect(() => mergeNormalResources(left, right)).toThrow();
		});
	});

	describe("float ID rejection", () => {
		it("fails validation with a float ID", () => {
			const result = validateCreateResource(soccerSchema, {
				type: "fields",
				id: 123.456,
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with a float ID in relationships", () => {
			const result = validateUpdateResource(soccerSchema, {
				type: "games",
				id: 100,
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: 200.5 },
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});
});

describe("resource-level schema validation", () => {
	const schemaWithCrossFieldValidation = {
		resources: {
			games: {
				attributes: {
					id: { type: "string" },
					title: { type: "string" },
					name: { type: "string" },
					type: { type: "string", enum: ["friendly", "tournament"] },
					homeScore: { type: "integer", minimum: 0 },
					awayScore: { type: "integer", minimum: 0 },
					tournamentRound: { type: "string" },
				},
				relationships: {},
				schema: {
					required: ["type"],
					oneOf: [{ required: ["title"] }, { required: ["name"] }],
					if: {
						properties: { type: { const: "tournament" } },
					},
					then: {
						required: ["tournamentRound"],
					},
				},
			},
		},
	};

	describe("oneOf validation", () => {
		it("passes validation when title is provided", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					title: "Spring Match",
					type: "friendly",
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation when name is provided", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					name: "Spring Match",
					type: "friendly",
				},
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation when neither title nor name is provided", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					type: "friendly",
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("conditional validation with if/then", () => {
		it("passes validation for tournament game with tournamentRound", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					title: "Cup Final",
					type: "tournament",
					tournamentRound: "final",
				},
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation for tournament game without tournamentRound", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					title: "Cup Match",
					type: "tournament",
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation for friendly game without tournamentRound", () => {
			const result = validateCreateResource(schemaWithCrossFieldValidation, {
				type: "games",
				attributes: {
					title: "Friendly Match",
					type: "friendly",
				},
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("backward compatibility with requiredAttributes", () => {
		const schemaWithRequiredAttributes = {
			resources: {
				teams: {
					requiredAttributes: ["name"],
					attributes: {
						id: { type: "string" },
						name: { type: "string" },
					},
					relationships: {},
				},
			},
		};

		// it("still validates requiredAttributes when schema is not present", () => {
		// 	const result = validateCreateResource(schemaWithRequiredAttributes, {
		// 		type: "teams",
		// 		attributes: {},
		// 	});
		// 	expect(result.length).toBeGreaterThan(0);
		// });

		it("passes validation when requiredAttributes are provided", () => {
			const result = validateCreateResource(schemaWithRequiredAttributes, {
				type: "teams",
				attributes: { name: "Phoenix Rising" },
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("schema.required takes precedence over requiredAttributes", () => {
		const schemaWithBoth = {
			resources: {
				teams: {
					requiredAttributes: ["name"],
					schema: {
						required: ["name", "city"],
					},
					attributes: {
						id: { type: "string" },
						name: { type: "string" },
						city: { type: "string" },
					},
					relationships: {},
				},
			},
		};

		it("requires fields from schema.required", () => {
			const result = validateCreateResource(schemaWithBoth, {
				type: "teams",
				attributes: { name: "Phoenix Rising" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes when all schema.required fields are provided", () => {
			const result = validateCreateResource(schemaWithBoth, {
				type: "teams",
				attributes: { name: "Phoenix Rising", city: "Phoenix" },
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("anyOf validation", () => {
		const schemaWithAnyOf = {
			resources: {
				referees: {
					attributes: {
						id: { type: "string" },
						hasAdvancedCert: { type: "boolean" },
						experience: { type: "integer", minimum: 0 },
						endorsements: { type: "integer", minimum: 0 },
					},
					relationships: {},
					schema: {
						if: {
							properties: { hasAdvancedCert: { const: true } },
						},
						then: {
							anyOf: [
								{
									properties: { experience: { minimum: 5 } },
								},
								{
									properties: { endorsements: { minimum: 3 } },
								},
							],
						},
					},
				},
			},
		};

		it("passes when hasAdvancedCert is true and experience >= 5", () => {
			const result = validateCreateResource(schemaWithAnyOf, {
				type: "referees",
				attributes: {
					hasAdvancedCert: true,
					experience: 10,
					endorsements: 0,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes when hasAdvancedCert is true and endorsements >= 3", () => {
			const result = validateCreateResource(schemaWithAnyOf, {
				type: "referees",
				attributes: {
					hasAdvancedCert: true,
					experience: 2,
					endorsements: 5,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("fails when hasAdvancedCert is true but insufficient qualifications", () => {
			const result = validateCreateResource(schemaWithAnyOf, {
				type: "referees",
				attributes: {
					hasAdvancedCert: true,
					experience: 2,
					endorsements: 1,
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes when hasAdvancedCert is false regardless of qualifications", () => {
			const result = validateCreateResource(schemaWithAnyOf, {
				type: "referees",
				attributes: {
					hasAdvancedCert: false,
					experience: 0,
					endorsements: 0,
				},
			});
			expect(result.length).toEqual(0);
		});
	});

	describe("update validation with schema", () => {
		const schemaForUpdate = {
			resources: {
				games: {
					attributes: {
						id: { type: "string" },
						title: { type: "string" },
						homeScore: { type: "integer", minimum: 0 },
						awayScore: { type: "integer", minimum: 0 },
					},
					relationships: {},
					schema: {
						oneOf: [{ required: ["homeScore"] }, { required: ["awayScore"] }],
					},
				},
			},
		};

		it("validates cross-field constraints on update", () => {
			const result = validateUpdateResource(schemaForUpdate, {
				type: "games",
				id: "game-123",
				attributes: {
					title: "Updated Match",
				},
			});
			// Update should allow partial updates, so this might pass
			// depending on how you want to handle partial updates
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes update when providing one of the required fields", () => {
			const result = validateUpdateResource(schemaForUpdate, {
				type: "games",
				id: "game-123",
				attributes: {
					title: "Updated Match",
					homeScore: 3,
				},
			});
			expect(result.length).toEqual(0);
		});
	});
});
