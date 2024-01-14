import { expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTables, seed } from "../../src/seed.js";
import { createSQLiteStore } from "../../src/sqlite-store.js";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bear.schema.js";
import { careBearConfig } from "../fixtures/care-bear-config.js";

const db = Database(":memory:");
createTables(db, careBearSchema, careBearConfig);
seed(db, careBearSchema, careBearConfig, careBearData);
const store = createSQLiteStore(careBearSchema, db, careBearConfig);

it("sorts on a numeric field", async () => {
	const result = await store.get({
		type: "bears",
		properties: { name: "name", yearIntroduced: "yearIntroduced" },
		order: [{ property: "yearIntroduced", direction: "desc" }],
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
		properties: { name: "name", yearIntroduced: "yearIntroduced" },
		order: [{ property: "name", direction: "asc" }],
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
		properties: { name: "name", yearIntroduced: "yearIntroduced" },
		order: [
			{ property: "yearIntroduced", direction: "desc" },
			{ property: "name", direction: "asc" },
		],
	});

	expect(result).toEqual([
		{ name: "Smart Heart Bear", yearIntroduced: 2005 },
		{ name: "Cheer Bear", yearIntroduced: 1982 },
		{ name: "Tenderheart Bear", yearIntroduced: 1982 },
		{ name: "Wish Bear", yearIntroduced: 1982 },
	]);
});
