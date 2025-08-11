import { describe, expect, it } from "vitest";
import {
	createValidator,
	validateQueryResult,
	validateCreateResource,
	validateDeleteResource,
	validateSpliceResource,
	validateUpdateResource,
} from "../src/resource.js";
import soccerSchema from "./fixtures/soccer.schema.json" with { type: "json" };
import geojsonSchema from "./fixtures/geojson.schema.json" with { type: "json" };

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
			id: "1",
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
			id: "1",
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

describe("resource splice validation", () => {
	describe("without an id", () => {
		it("fails validation on an empty object", () => {
			const result = validateSpliceResource(soccerSchema, {});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation on an invalid type", () => {
			const result = validateSpliceResource(soccerSchema, { type: "foo" });
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation on an object with only a type and nothing required", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "fields",
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation on an object with only a type and at least one required attribute", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "teams",
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with an valid type", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "fields",
				attributes: { name: "Tempe Elementary B" },
			});
			expect(result.length).toEqual(0);
		});

		it("fails validation with an invalid type", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "fields",
				attributes: { name: 5 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid minimum", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: -1 },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid pattern", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "fields",
				attributes: { name: "my field" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an invalid related resource", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: {},
				},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation with a null, non-required relationship", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 5, awayScore: 1 },
				relationships: {
					homeTeam: null,
				},
			});
			expect(result.length).toEqual(0);
		});

		it("passes validation with a valid relationship", () => {
			const result = validateSpliceResource(soccerSchema, {
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
			const result = validateSpliceResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with an empty relationships object without the required relationships", () => {
			const result = validateSpliceResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Tempe Wave" },
				relationships: {},
			});
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation with a null, required relationship", () => {
			const result = validateSpliceResource(soccerSchema, {
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
				id: "1",
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
				id: "1",
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
			const result = validateSpliceResource(soccerSchema, {
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
			const result = validateSpliceResource(soccerSchema, {
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
			const result = validateSpliceResource(soccerSchema, {
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
			const result = validateSpliceResource(soccerSchema, {
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
			const result = validateSpliceResource(soccerSchema, {
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
});
