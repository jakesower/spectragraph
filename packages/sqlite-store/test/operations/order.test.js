import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTables, seed } from "../../src/seed.js";
import { createSQLiteStore } from "../../src/sqlite-store.js";
import { careBearData, careBearSchema } from "../interface-tests/src/index.js";
import { careBearConfig } from "../care-bear-config.js";

const db = Database(":memory:");
createTables(db, careBearSchema, careBearConfig);
seed(db, careBearSchema, careBearConfig, careBearData);
const store = createSQLiteStore(careBearSchema, db, careBearConfig);

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
