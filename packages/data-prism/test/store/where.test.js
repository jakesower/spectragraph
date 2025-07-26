import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import careBearSchema from "../fixtures/care-bears.schema.json";
import { createMemoryStore } from "../../src/memory-store.js";

const store = createMemoryStore(careBearSchema, careBearData);

describe("where clauses particular to the store", () => {
	it("disallows filtering on invalid attribute names", async () => {
		await expect(async () => {
			return store.query({
				type: "bears",
				select: ["name"],
				where: { lol: "oops" },
			});
		}).rejects.toThrowError();
	});

	it("disallows filtering on the paths of attribute names", async () => {
		await expect(async () => {
			return store.query({
				type: "bears",
				select: ["name"],
				where: { "home.invalid": "oops" },
			});
		}).rejects.toThrowError();
	});
});
