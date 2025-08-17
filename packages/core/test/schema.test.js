import { describe, expect, it } from "vitest";
import { validateSchema } from "../src/schema.js";
import { careBearSchema } from "@data-prism/test-fixtures";

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
					relationships: { rel: { type: "buildings", cardinality: "one" } },
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
