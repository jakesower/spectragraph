import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import metaschema from "../src/schemas/data-prism-schema.1.0.0.schema.json" assert { type: "json" };
import cbSchema from "./fixtures/care-bears.schema.json" assert { type: "json" };

const ajv = new Ajv();
const validate = ajv.compile(metaschema);

describe("the data prism metaschema", () => {
	describe("with the sample Care Bear schema", () => {
		it("should pass validation", () => {
			validate(cbSchema);
			expect(validate.errors).toBe(null);
		});
	});
});
