import { describe, expect, it } from "vitest";
import { validateSchema } from "../src/schema.js";
import { careBearSchema } from "../interface-tests/src/index.js";

describe("structure", () => {
	it("should validate a valid schema", () => {
		const result = validateSchema(careBearSchema);
		expect(result).toEqual([]);
	});

	it("should not validate a nonobject schema", () => {
		const result = validateSchema("hi");
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema that's an array", () => {
		const result = validateSchema([careBearSchema]);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema without resources", () => {
		const result = validateSchema({ title: "hi" });
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with a schema that's an array", () => {
		const result = validateSchema({ title: "hi", resources: ["hi"] });
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("attributes", () => {
	it("should not validate a schema without attributes", () => {
		const schema = { resources: { buildings: { relationships: {} } } };
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should validate a schema with only an id attribute", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "number" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result).toEqual([]);
	});

	it("should not validate a schema without an id attribute", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { height: { type: "number" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema without a non defaulted id attribute", () => {
		const schema = {
			resources: {
				buildings: {
					idAttribute: "buildingId",
					attributes: { id: { type: "number" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with an invalid attribute type", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "nothing" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with a missing required attribute", () => {
		const schema = {
			resources: {
				buildings: {
					requiredAttributes: ["location"],
					attributes: { id: { type: "number" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("relationships", () => {
	it("should not validate a schema without relationships", () => {
		const schema = {
			resources: { buildings: { attributes: { id: { type: "string" } } } },
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with an invalid relationship", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: { builder: {} },
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with an invalid relationship cardinality", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: {
						builder: { cardinality: "many", type: "builders", inverse: null },
					},
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toEqual(0);

		const schema2 = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: {
						builder: { cardinality: "some", type: "builders" },
					},
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		};
		const result2 = validateSchema(schema2);
		expect(result2.length).toBeGreaterThan(0);
	});

	it("should not validate a schema with a missing relationship inverse", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: {
						builder: { cardinality: "many", type: "builders" },
					},
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should validate a schema with a null relationship inverse", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: {
						builder: { cardinality: "many", type: "builders", inverse: null },
					},
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toEqual(0);
	});

	it("should not validate a schema with an invalid relationship type", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: { builder: { cardinality: "one", type: "fake" } },
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should validate a schema with a present required relationship", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "number" } },
					requiredRelationships: ["rel"],
					relationships: {
						rel: { type: "buildings", cardinality: "one", inverse: "rel" },
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toEqual(0);
	});

	it("should not validate a schema with a missing required relationship", () => {
		const schema = {
			resources: {
				buildings: {
					attributes: { id: { type: "number" } },
					requiredRelationships: ["builder"],
					relationships: { rel: { type: "buildings", cardinality: "one" } },
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("real world bugs", () => {
	it("should not compile with an attribute that has a bad format", () => {
		const schema = structuredClone(careBearSchema);
		schema.resources.bears.attributes.yearIntroduced.format = "bad-bugz";

		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});
});

describe("resource-level schema field", () => {
	it("should validate a schema with a resource-level schema field", () => {
		const schema = {
			resources: {
				games: {
					attributes: {
						id: { type: "string" },
						title: { type: "string" },
						homeScore: { type: "integer" },
					},
					relationships: {},
					schema: {
						required: ["title"],
						oneOf: [{ required: ["homeScore"] }],
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result).toEqual([]);
	});

	it("should not validate when schema contains properties field", () => {
		const schema = {
			resources: {
				games: {
					attributes: {
						id: { type: "string" },
						title: { type: "string" },
					},
					relationships: {},
					schema: {
						properties: {
							title: { type: "string" },
						},
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0].message).toContain("properties");
	});

	it("should validate schema with complex cross-field validation", () => {
		const schema = {
			resources: {
				games: {
					attributes: {
						id: { type: "string" },
						type: { type: "string", enum: ["friendly", "tournament"] },
						tournamentRound: { type: "string" },
					},
					relationships: {},
					schema: {
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
		const result = validateSchema(schema);
		expect(result).toEqual([]);
	});

	it("should not validate schema with invalid JSON Schema syntax", () => {
		const schema = {
			resources: {
				teams: {
					attributes: {
						id: { type: "string" },
						name: { type: "string" },
					},
					relationships: {},
					schema: {
						// Invalid - oneOf requires an array
						oneOf: { required: ["name"] },
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result.length).toBeGreaterThan(0);
	});

	it("should validate schema with anyOf", () => {
		const schema = {
			resources: {
				referees: {
					attributes: {
						id: { type: "string" },
						hasAdvancedCert: { type: "boolean" },
						experience: { type: "integer" },
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
							],
						},
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result).toEqual([]);
	});

	it("should validate schema with allOf", () => {
		const schema = {
			resources: {
				fields: {
					attributes: {
						id: { type: "string" },
						name: { type: "string" },
						capacity: { type: "integer" },
					},
					relationships: {},
					schema: {
						allOf: [
							{ required: ["name"] },
							{
								if: {
									properties: { capacity: { minimum: 20000 } },
								},
								then: {
									required: ["name"],
								},
							},
						],
					},
				},
			},
		};
		const result = validateSchema(schema);
		expect(result).toEqual([]);
	});
});
