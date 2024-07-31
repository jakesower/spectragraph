import { describe, expect, it } from "vitest";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { createJSONAPIStore } from "../../src/jsonapi-store.js";
import { makeRequest } from "../helpers.js";

const store = createJSONAPIStore(careBearSchema, {
	baseURL: "http://127.0.0.1",
	transport: { get: makeRequest },
});

describe("order tests", async () => {
	it("sorts on a numeric field", async () => {
		const result = await store.get({
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: { yearIntroduced: "desc" },
		});

		expect(result).toEqual([
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});

	it("sorts on a string field", async () => {
		const result = await store.get({
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: { name: "asc" },
		});

		expect(result).toEqual([
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});

	it("sorts on a numerical and a string field", async () => {
		const result = await store.get({
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: [{ yearIntroduced: "desc" }, { name: "asc" }],
		});

		expect(result).toEqual([
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});
});
