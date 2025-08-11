import { expect, it, describe } from "vitest";
import { queryGraph } from "../../src/graph.js";
import careBearsSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import careBearData from "../fixtures/care-bear-data.json" with { type: "json" };

describe("order tests", async () => {
	it("sorts on a numeric field", async () => {
		const query = {
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: { yearIntroduced: "desc" },
		};
		const result = queryGraph(careBearsSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});

	it("sorts on a string field", async () => {
		const query = {
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: { name: "asc" },
		};
		const result = queryGraph(careBearsSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});

	it("sorts on a numerical and a string field", async () => {
		const query = {
			type: "bears",
			select: { name: "name", yearIntroduced: "yearIntroduced" },
			order: [{ yearIntroduced: "desc" }, { name: "asc" }],
		};
		const result = queryGraph(careBearsSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear", yearIntroduced: 2005 },
			{ name: "Cheer Bear", yearIntroduced: 1982 },
			{ name: "Tenderheart Bear", yearIntroduced: 1982 },
			{ name: "Wish Bear", yearIntroduced: 1982 },
		]);
	});

	it("sorts on a field with a nested resource", async () => {
		const query = {
			type: "bears",
			select: {
				name: "name",
				yearIntroduced: "yearIntroduced",
				home: { select: ["name"] },
			},
			order: [{ yearIntroduced: "desc" }, { name: "asc" }],
		};
		const result = queryGraph(careBearsSchema, query, careBearData);

		expect(result).toEqual([
			{
				name: "Smart Heart Bear",
				yearIntroduced: 2005,
				home: null,
			},
			{
				name: "Cheer Bear",
				yearIntroduced: 1982,
				home: { name: "Care-a-Lot" },
			},
			{
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				home: { name: "Care-a-Lot" },
			},
			{ name: "Wish Bear", yearIntroduced: 1982, home: { name: "Care-a-Lot" } },
		]);
	});

	it("disallows sorting on invalid attribute names", async () => {
		await expect(async () => {
			return queryGraph(
				careBearsSchema,
				{
					type: "bears",
					select: ["name"],
					order: { lol: "asc" },
				},
				careBearData,
			);
		}).rejects.toThrowError();
	});
});
