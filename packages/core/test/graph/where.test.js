import { expect, it, describe } from "vitest";
import { mathPack } from "json-expressions";
import { queryGraph } from "../../src/graph.js";
import { careBearSchema, careBearData } from "../interface-tests/src/index.js";
import { createWhereEngine } from "../../src/index.js";

describe("where clauses", () => {
	it("filters on an implicit property equality constraint", async () => {
		const query = {
			type: "bears",
			select: ["id", "name"],
			where: { name: "Cheer Bear" },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
	});

	it("doesn't break on an empty where object", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ id: "1" },
			{ id: "2" },
			{ id: "3" },
			{ id: "5" },
		]);
	});

	it("filters on a property that is not returned from properties", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: { name: { $eq: "Cheer Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "2" }]);
	});

	it("filters on multiple property equality where", async () => {
		const query = {
			type: "homes",
			select: ["id"],
			where: {
				caringMeter: 1,
				isInClouds: false,
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "2" }]);
	});

	it("filters using $eq operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $eq: 2005 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $gt operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $gt: 2000 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $lt operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $lt: 2000 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters using $lte operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $lte: 2000 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters using $gte operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $gte: 2005 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $in 1", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $in: [2005, 2022] },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $in 2", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $in: [2022] },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([]);
	});

	it("filters using $ne operator", async () => {
		const query = {
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $ne: 2005 },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters using array shorthand for $in", async () => {
		const query = {
			type: "bears",
			select: ["id", "name"],
			where: {
				furColor: ["tan", "turquoise"],
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ id: "1", name: "Tenderheart Bear" },
			{ id: "3", name: "Wish Bear" },
		]);
	});

	it("filters related resources", async () => {
		const query = {
			type: "powers",
			id: "careBearStare",
			select: {
				powerId: "powerId",
				wielders: {
					select: ["id"],
					where: {
						bellyBadge: { $eq: "shooting star" },
					},
				},
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual({
			powerId: "careBearStare",
			wielders: [{ id: "3" }],
		});
	});

	describe("advanced expressions", () => {
		it("filters using an $or operation", async () => {
			const query = {
				type: "bears",
				select: {
					id: "id",
				},
				where: {
					$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
				},
			};
			const result = queryGraph(careBearSchema, query, careBearData);

			expect(result).toEqual([{ id: "2" }, { id: "5" }]);
		});

		it("filters using an $or and $and operation", async () => {
			const query = {
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
			};
			const result = queryGraph(careBearSchema, query, careBearData);

			expect(result).toEqual([{ id: "5" }]);
		});

		it("filters using an $or and $not operation", async () => {
			const query = {
				type: "bears",
				select: {
					id: "id",
				},
				where: {
					$not: {
						$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
					},
				},
			};
			const result = queryGraph(careBearSchema, query, careBearData);

			expect(result).toEqual([{ id: "1" }, { id: "3" }]);
		});

		it.only("filters using $matches", () => {
			const query = {
				type: "bears",
				select: ["name"],
				where: {
					$matchesAll: {
						yearIntroduced: { $lte: 1982 },
						bellyBadge: "shooting star",
					},
				},
			};
			const result = queryGraph(careBearSchema, query, careBearData);

			expect(result).toEqual([{ name: "Wish Bear" }]);
		});

		it("filters with an expression from a pack", () => {
			const whereEngine = createWhereEngine({
				packs: [mathPack],
			});

			const query = {
				type: "bears",
				select: ["name"],
				where: {
					$matchesAll: {
						yearIntroduced: { $eq: [{ $modulo: 2 }, 1] },
					},
				},
			};
			const result = queryGraph(careBearSchema, query, careBearData, {
				whereEngine,
			});

			expect(result).toEqual([{ name: "Smart Heart Bear" }]);
		});

		it("filters with a custom expression", () => {
			const whereEngine = createWhereEngine({
				custom: {
					$isOdd: (operand, inputData) => inputData % 2 === 1,
				},
			});

			const query = {
				type: "bears",
				select: ["name"],
				where: {
					$matchesAll: {
						yearIntroduced: { $isOdd: null },
					},
				},
			};
			const result = queryGraph(careBearSchema, query, careBearData, {
				whereEngine,
			});

			expect(result).toEqual([{ name: "Smart Heart Bear" }]);
		});

		it("errors with an undefined custom expression", () => {
			const query = {
				type: "bears",
				select: ["name"],
				where: {
					yearIntroduced: { $anUndefinedExpression: null },
				},
			};

			expect(() =>
				queryGraph(careBearSchema, query, careBearData),
			).toThrowError();
		});
	});
});
