import { expect, it } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bears.schema.js";
import { createGraph } from "../../src/graph.js";

const graph = createGraph(careBearSchema, careBearData);

it("sorts on a numeric field", async () => {
	const result = await graph.getTrees({
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
	const result = await graph.getTrees({
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
	const result = await graph.getTrees({
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
