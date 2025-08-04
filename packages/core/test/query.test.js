import { expect, it, describe } from "vitest";
import { normalizeQuery } from "../src/query.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };

describe("normalizeQuery", () => {
	it("adds type to subqueries", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: ["id"] } },
		});

		expect(normal.select.home.type).toEqual("homes");
	});

	it("expands * strings in select", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: "*" } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});

	it("expands * strings in arrays", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: ["*"] } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});

	it("expands * strings in select", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: { "*": true } } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});
});
