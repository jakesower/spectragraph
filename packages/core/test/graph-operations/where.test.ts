import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearSchema } from "../fixtures/care-bears.schema";
import { createGraph } from "../../src/graph.js";

const graph = createGraph(careBearSchema, careBearData);

it("filters on a property equality constraint", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id", "name"],
		where: { name: "Cheer Bear" },
	});

	expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
});

it("filters on a property that is not returned from properties", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: { name: { $eq: "Cheer Bear" } },
	});

	expect(result).toEqual([{ id: "2" }]);
});

it("filters on multiple property equality where", async () => {
	const result = await graph.getTrees({
		type: "homes",
		select: ["id"],
		where: {
			caringMeter: 1,
			isInClouds: false,
		},
	});

	expect(result).toEqual([{ id: "2" }]);
});

it("filters using $eq operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $eq: 2005 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it("filters using $gt operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $gt: 2000 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it("filters using $lt operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $lt: 2000 },
		},
	});

	expect(result).toEqual([
		{ id: "1" },
		{ id: "2" },
		{ id: "3" },
	]);
});

it("filters using $lte operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $lte: 2000 },
		},
	});

	expect(result).toEqual([
		{ id: "1" },
		{ id: "2" },
		{ id: "3" },
	]);
});

it("filters using $gte operator", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $gte: 2005 },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
});

it("filters using $in 1", async () => {
	const result = await graph.getTrees({
		type: "bears",
		select: ["id"],
		where: {
			yearIntroduced: { $in: [2005, 2022] },
		},
	});

	expect(result).toEqual([{ id: "5" }]);
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
		select: ["id"],
		where: {
			yearIntroduced: { $ne: 2005 },
		},
	});

	expect(result).toEqual([
		{ id: "1" },
		{ id: "2" },
		{ id: "3" },
	]);
});

it("filters related resources", async () => {
	const result = await graph.getTree({
		type: "powers",
		id: "careBearStare",
		select: {
			powerId: "powerId",
			wielders: {
				select: ["id"],
				where: {
					yearIntroduced: { $gt: 2000 },
				},
			},
		},
	});

	expect(result).toEqual({
		powerId: "careBearStare",
		wielders: [{ id: "5" }],
	});
});

describe.skip("dot notation", () => {
	it("filters on to-one relationships using dot notation", async () => {
		const result = await graph.getTrees({
			type: "bears",
			select: {
				id: "id",
				home: {
					select: {
						name: "name",
					},
				},
			},
			where: {
				"home.name": "Care-a-Lot",
			},
		});

		expect(result).toEqual([
			{ id: "1", home: { name: "Care-a-Lot" } },
			{ id: "2", home: { name: "Care-a-Lot" } },
			{ id: "3", home: { name: "Care-a-Lot" } },
		]);
	});

	it("filters on to-one relationships using dot notation when not queried for in properties", async () => {
		const result = await graph.getTrees({
			type: "bears",
			select: {
				id: "id",
			},
			where: {
				"home.name": "Care-a-Lot",
			},
		});

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});
});

describe.skip("expressions", () => {
	it("filters using an $or operation", async () => {
		const result = await graph.getTrees({
			type: "bears",
			select: {
				id: "id",
			},
			where: {
				$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
			},
		});

		expect(result).toEqual([{ id: "2" }, { id: "5" }]);
	});

	it("filters using an $or and $and operation", async () => {
		const result = await graph.getTrees({
			type: "bears",
			select: {
				id: "id",
			},
			where: {
				$or: [
					{ yearIntroduced: { $gt: 2000 } },
					{ $and: [{ name: "Tenderheart Bear" }, { bellyBadge: "rainbow" }] },
				],
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using an $or and $not operation", async () => {
		const result = await graph.getTrees({
			type: "bears",
			select: {
				id: "id",
			},
			where: {
				$not: {
					$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
				},
			},
		});

		expect(result).toEqual([{ id: "1" }, { id: "3" }]);
	});
});
