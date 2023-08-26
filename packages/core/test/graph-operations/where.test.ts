import { expect, it } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bears.schema";
import { createGraph } from "../../dist/graph.js";

const graph = createGraph(careBearSchema, careBearData);

it("filters on a property equality constraint", async () => {
	const result = await graph.getTrees({
		type: "bears",
		properties: { id: "id", name: "name" },
		where: { name: "Cheer Bear" },
	});

	expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
});

it("filters on a property that is not returned from properties", async () => {
	const result = await graph.getTrees({
		type: "bears",
		properties: { id: "id" },
		where: { name: { $eq: "Cheer Bear" } },
	});

	expect(result).toEqual([{ id: "2" }]);
});

it("filters on multiple property equality where", async () => {
	const result = await graph.getTrees({
		type: "homes",
		where: {
			caringMeter: 1,
			isInClouds: false,
		},
	});

	expect(result).toEqual([{ type: "homes", id: "2" }]);
});

it("filters using $eq operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $eq: 2005 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it("filters using $gt operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $gt: 2000 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it("filters using $lt operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $lt: 2000 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it("filters using $lte operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $lte: 2000 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it("filters using $gte operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $gte: 2005 },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it("filters using $in 1", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2005, 2022] },
		},
	});

	expect(result).toEqual([{ type: "bears", id: "5" }]);
});

it("filters using $in 2", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $in: [2022] },
		},
	});

	expect(result).toEqual([]);
});

it("filters using $ne operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		where: {
			yearIntroduced: { $ne: 2005 },
		},
	});

	expect(result).toEqual([
		{ type: "bears", id: "1" },
		{ type: "bears", id: "2" },
		{ type: "bears", id: "3" },
	]);
});

it("filters related resources", async () => {
	const result = await graph.getTree({
		type: "powers",
		id: "careBearStare",
		properties: {
			powerId: "powerId",
			wielders: {
				where: {
					yearIntroduced: { $gt: 2000 },
				},
			},
		},
	});

	expect(result).toEqual({
		powerId: "careBearStare",
		wielders: [{ type: "bears", id: "5" }],
	});
});
