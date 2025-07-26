import { expect, it } from "vitest";
import { createValidator, ensureValidSchema } from "../src/index.js";
import careBearSchema from "./fixtures/care-bears.schema.json";

it("should validate a valid schema", () => {
	expect(() => ensureValidSchema(careBearSchema)).not.toThrowError();
});

it("should not validate a nonobject schema", () => {
	expect(() => ensureValidSchema("hi")).toThrowError();
});

it("should not validate a schema that's an array", () => {
	expect(() => ensureValidSchema(["hi"])).toThrowError();
});

it("should not validate a schema without resources or that's an array", () => {
	expect(() => ensureValidSchema({ title: "hi" })).toThrowError();
	expect(() =>
		ensureValidSchema({ title: "hi", resources: ["hi"] }),
	).toThrowError();
});

it("should not validate a schema without attributes", () => {
	expect(() =>
		ensureValidSchema({ resources: { buildings: { relationships: {} } } }),
	).toThrowError();
});

it("should validate a schema with only an id attribute", () => {
	expect(() =>
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: { type: "number" } },
					relationships: {},
				},
			},
		}),
	).not.toThrowError();
});

it("should not validate a schema without an id attribute", () => {
	expect(() =>
		ensureValidSchema({
			resources: { buildings: { attributes: { height: { type: "number" } } } },
		}),
	).toThrowError();
});

it("should not validate a schema without a non defaulted id attribute", () => {
	expect(() =>
		ensureValidSchema({
			resources: {
				buildings: {
					idAttribute: "buildingId",
					attributes: { id: { type: "number" } },
				},
			},
		}),
	).toThrowError();
});

it("should not validate a schema without relationships", () => {
	expect(() =>
		ensureValidSchema({
			resources: { buildings: { attributes: { id: { type: "string" } } } },
		}),
	).toThrowError();
});

it("should not validate a schema with an invalid relationship", () => {
	expect(() =>
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: { builder: {} },
				},
			},
		}),
	).toThrowError();
});

it("should not validate a schema with a missing resource type", () => {
	expect(() =>
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: {} },
					relationships: {},
				},
			},
		}),
	).toThrowError();
});

it("should not validate a schema with an invalid resource type", () => {
	expect(() =>
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: { type: "nothing" } },
					relationships: {},
				},
			},
		}),
	).toThrowError();
});

it("should not validate a schema with an invalid resource cardinality", () => {
	expect(() => {
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: { builder: { cardinality: "many", type: "builders" } },
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		});
	}).not.toThrowError();

	expect(() => {
		ensureValidSchema({
			resources: {
				buildings: {
					attributes: { id: { type: "string" } },
					relationships: { builder: { cardinality: "some", type: "builders" } },
				},
				builders: {
					attributes: { id: { type: "string" } },
					relationships: {},
				},
			},
		});
	}).toThrowError();
});

it("should not validate a schema with an invalid resource type", () => {
	expect(() => {
		ensureValidSchema({
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
		});
	}).toThrowError();
});
