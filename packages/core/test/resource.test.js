import { describe, expect, it } from "vitest";
import {
	createValidator,
	validateQueryResult,
	validateCreateResource,
	validateDeleteResource,
	validateSpliceResource,
	validateUpdateResource,
	createResource,
} from "../src/resource.js";
import { soccerSchema, geojsonSchema } from "@data-prism/test-fixtures";

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

describe("createResource", () => {
	describe("basic functionality", () => {
		it("creates a resource with all defaults applied when no attributes provided", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
			});

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
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: {
					name: "Stadium Field",
				},
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
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: {
					surface: "turf",
					capacity: 8000,
				},
			});

			expect(result.attributes.surface).toBe("turf");
			expect(result.attributes.capacity).toBe(8000);
		});

		it("creates a resource with provided ID", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				id: "custom-id",
			});

			expect(result.id).toBe("custom-id");
			expect(result.attributes.id).toBe("custom-id");
		});
	});

	describe("different data types", () => {
		it("applies string defaults", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
			});

			expect(result.attributes.status).toBe("scheduled");
		});

		it("applies integer defaults", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
			});

			expect(result.attributes.attendance).toBe(0);
		});

		it("applies boolean defaults", () => {
			const result = createResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Test Team" },
				relationships: {
					homeField: { type: "fields", id: "field-1" },
				},
			});

			expect(result.attributes.active).toBe(true);
		});

		it("applies multiple types of defaults simultaneously", () => {
			const result = createResource(soccerSchema, {
				type: "teams",
				attributes: { name: "FC Example" },
			});

			expect(result.attributes).toMatchObject({
				homeColor: "blue", // string default
				awayColor: "white", // string default
				founded: 2000, // integer default
				active: true, // boolean default
			});
		});

		it("applies array defaults", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: { name: "Test Field" },
			});

			expect(result.attributes.amenities).toEqual([]);
		});

		it("applies nested object defaults", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 1, awayScore: 0 },
			});

			expect(result.attributes.bookings).toEqual({
				homeTeam: [],
				awayTeam: [],
			});
		});

		it("applies nested object defaults within an array", () => {
			const result = createResource(soccerSchema, {
				type: "referees",
				attributes: { certifications: [{ certifyingBody: "SCRA" }] },
			});

			expect(result.attributes.certifications).toEqual([
				{
					certifyingBody: "SCRA",
					grade: 9,
				},
			]);
		});

		it("applies nested object defaults within an object", () => {
			const result = createResource(soccerSchema, {
				type: "teams",
				attributes: { sponsors: { orangeDrink: { name: "Orange Drink" } } },
			});

			expect(result.attributes.sponsors).toEqual({
				FIFA: { amount: 50 },
				orangeDrink: { name: "Orange Drink", amount: 10000000 },
			});
		});

		it("applies patternProperties defaults based on property name patterns", () => {
			const result = createResource(soccerSchema, {
				type: "teams",
				attributes: { 
					sponsors: { 
						local_bakery: { name: "Local Bakery" },
						global_tech: { name: "Global Tech Corp" },
						randomSponsor: { name: "Random Sponsor" },
					}, 
				},
			});

			expect(result.attributes.sponsors).toEqual({
				FIFA: { amount: 50 },
				local_bakery: { name: "Local Bakery", amount: 5000, region: "local" },
				global_tech: { name: "Global Tech Corp", amount: 25000000, region: "global" },
				randomSponsor: { name: "Random Sponsor", amount: 10000000 },
			});
		});
	});

	describe("relationship handling", () => {
		it("initializes empty array for many cardinality relationships", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
			});

			expect(result.relationships.teams).toEqual([]);
		});

		it("initializes null for one cardinality relationships", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
			});

			expect(result.relationships.homeTeam).toBeNull();
			expect(result.relationships.awayTeam).toBeNull();
			expect(result.relationships.referee).toBeNull();
		});

		it("preserves provided relationships", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
				relationships: {
					homeTeam: { type: "teams", id: "team-1" },
				},
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
			const result = createResource(soccerSchema, {
				type: "fields",
			});

			expect(result.attributes.id).toBeUndefined();
			expect(result.id).toBeUndefined();
		});

		it("uses custom idAttribute from schema", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
			});

			// games has idAttribute: "id" in schema
			expect(result.attributes.id).toBeUndefined();
			expect(result.id).toBe(result.attributes.id);
		});

		it("handles provided ID correctly", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				id: "custom-field-id",
			});

			expect(result.id).toBe("custom-field-id");
			expect(result.attributes.id).toBe("custom-field-id");
		});
	});

	describe("edge cases", () => {
		it("handles empty attributes object", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: {},
			});

			expect(result.attributes).toMatchObject({
				surface: "grass",
				capacity: 5000,
				amenities: [],
			});
		});

		it("handles empty relationships object", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				relationships: {},
			});

			expect(result.relationships.teams).toEqual([]);
		});

		it("handles resource types without defaults", () => {
			// Create a minimal resource for a type that originally had no defaults
			const result = createResource(soccerSchema, {
				type: "referees",
				attributes: { name: "Test Referee" },
			});

			expect(result.attributes.name).toBe("Test Referee");
			expect(result.attributes.experience).toBe(0);
			expect(result.attributes.certifications).toEqual([]);
		});

		it("handles null/undefined attribute values correctly", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: {
					name: null,
					surface: undefined,
				},
			});

			// null should be preserved, undefined should get default
			expect(result.attributes.name).toBeNull();
			expect(result.attributes.surface).toBe("grass");
		});

		it("handles provided arrays overriding array defaults", () => {
			const result = createResource(soccerSchema, {
				type: "fields",
				attributes: {
					amenities: ["parking", "restrooms"],
				},
			});

			expect(result.attributes.amenities).toEqual(["parking", "restrooms"]);
		});

		it("handles provided objects overriding nested object defaults", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: {
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
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: {
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
			const result = createResource(soccerSchema, {
				type: "teams",
				attributes: { name: "Valid Team" },
				relationships: {
					homeField: { type: "fields", id: "field-1" },
				},
			});

			const validationResult = validateCreateResource(soccerSchema, result);
			expect(validationResult).toHaveLength(0);
		});

		it("respects required attributes from schema", () => {
			const result = createResource(soccerSchema, {
				type: "games",
				attributes: { homeScore: 2, awayScore: 1 },
			});

			// homeScore and awayScore are required and provided
			expect(result.attributes.homeScore).toBe(2);
			expect(result.attributes.awayScore).toBe(1);
			// defaults should still be applied
			expect(result.attributes.status).toBe("scheduled");
		});
	});
});
