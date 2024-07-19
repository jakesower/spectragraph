import { describe, expect, it } from "vitest";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { Schema } from "data-prism";
import { parseResponse } from "../src/parse-response";

it("parses a response with multiple resources", async () => {
	const query = parseResponse(careBearSchema as Schema, { type: "bears" });

	expect(query).toStrictEqual({
		type: "bears",
		select: Object.keys(careBearSchema.resources.bears.attributes),
	});
});
