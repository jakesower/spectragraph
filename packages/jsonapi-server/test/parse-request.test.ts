import { describe, expect, it } from "vitest";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { parseRequest } from "../src/parse-request.js";
import { Schema } from "data-prism";

describe("requests with no subqueries", () => {
	it("parses a request for multiple resources", async () => {
		const query = parseRequest(careBearSchema as Schema, { type: "bears" });

		expect(query).toEqual({
			type: "bears",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("parses a request for a single resource", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "bears",
			id: "1",
		});

		expect(query).toEqual({
			type: "bears",
			id: "1",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("limits fields on the root query", () => {
		const query = parseRequest(careBearSchema as Schema, {
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

	describe("filter", () => {
		it("filters fields on a single criterion", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: 1982 },
			});

			expect(query).toEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: 1982 },
			});
		});

		it("filters fields on multiple criteria", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: 1982, bellyBadge: "rainbow" },
			});

			expect(query).toEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: 1982, bellyBadge: "rainbow" },
			});
		});

		it("filters with an expression", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: { $lt: 1985 } },
			});

			expect(query).toEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: { $lt: 1985 } },
			});
		});

		it("filters with a string expression", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: "{ $lt: 1985 }" },
			});

			expect(query).toEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: { $lt: 1985 } },
			});
		});
	});
});
