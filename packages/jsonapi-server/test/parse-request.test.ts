import { describe, expect, it } from "vitest";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { parseRequest } from "../src/parse-request.js";

describe("requests with no subqueries", () => {
	it("parses a request for multiple resources", async () => {
		const query = parseRequest(careBearSchema, { type: "bears" });

		expect(query).toEqual({
			type: "bears",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("parses a request for a single resource", async () => {
		const query = parseRequest(careBearSchema, { type: "bears", id: "1" });

		expect(query).toEqual({
			type: "bears",
			id: "1",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("limits fields on the root query", () => {
		const query = parseRequest(careBearSchema, {
			type: "bears",
			id: "1",
			fields: { bears: "name,bellyBadge" },
		});

		expect(query).toEqual({
			type: "bears",
			id: "1",
			select: ["name", "bellyBadge"],
		});
	});
});
