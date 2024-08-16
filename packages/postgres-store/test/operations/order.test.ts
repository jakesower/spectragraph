import { describe, expect, it } from "vitest";
import { db } from "../global-setup.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { careBearConfig } from "../care-bear-config.js";

await db.connect();
const store = createPostgresStore(careBearSchema, { ...careBearConfig, db });

describe("order tests", async () => {
	it("sorts on a numeric field", async () => {
		const result = await store.query({
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
		const result = await store.query({
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
		const result = await store.query({
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
