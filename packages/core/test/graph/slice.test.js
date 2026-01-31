import { expect, it, describe } from "vitest";
import { queryGraph } from "../../src/graph.js";
import { ensureValidQueryResult } from "../../src/resource.js";
import { careBearSchema, careBearData } from "../interface-tests/src/index.js";

describe("limit/offset", () => {
	it("fetches a single resource", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			slice: { limit: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ name: "Tenderheart Bear" }]);
		expect(() => {
			ensureValidQueryResult(careBearSchema, query, result);
		});
	});

	it("limits after sorting", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 2 },
		};

		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
		]);

		expect(() => {
			ensureValidQueryResult(careBearSchema, query, result);
		});
	});

	it("limits after sorting with 1", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("limits with an offset", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 2, offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("allows for offset only", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("allows for limit + offset to exceed size of data", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 6, offset: 2 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("returns nothing when the offset has surpassed the data size", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 6, offset: 20 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([]);
	});

	it("allows a zero offset", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { offset: 0 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});
});

// ordered by name asc: Cheer, Smart Heart, Tenderheart, Wish
// yearIntroduced: Cheer(1982), Smart Heart(2005), Tenderheart(1982), Wish(1982)
describe("before/after", () => {
	it("returns results after an anchor value", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { after: { name: "Smart Heart Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name > "Smart Heart Bear" in asc order
		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("returns results before an anchor value", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { before: { name: "Tenderheart Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name < "Tenderheart Bear" in asc order
		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});

	it("returns results after an anchor with limit", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { after: { name: "Cheer Bear" }, limit: 2 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name > "Cheer Bear", take first 2
		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("takes from the end when using before with limit", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { before: { name: "Wish Bear" }, limit: 2 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name < "Wish Bear" → [Cheer, Smart Heart, Tenderheart], limit 2 from end
		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("applies before with limit and offset from the end", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { before: { name: "Wish Bear" }, limit: 1, offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name < "Wish Bear" → [Cheer, Smart Heart, Tenderheart]
		// offset 1 from end → [Cheer, Smart Heart], limit 1 from end → [Smart Heart]
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("returns a window when using both after and before", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: {
				after: { name: "Cheer Bear" },
				before: { name: "Wish Bear" },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// "Cheer Bear" < name < "Wish Bear"
		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("returns a window with after, before, and limit", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: {
				after: { name: "Cheer Bear" },
				before: { name: "Wish Bear" },
				limit: 1,
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// window is [Smart Heart, Tenderheart], limit 1 from start
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("excludes rows equal to the anchor value", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "asc" },
			slice: { after: { yearIntroduced: 1982 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// yearIntroduced > 1982 → only Smart Heart (2005)
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("returns empty when no rows satisfy before constraint", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "asc" },
			slice: { before: { yearIntroduced: 1982 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// yearIntroduced < 1982 → nothing (earliest is 1982)
		expect(result).toEqual([]);
	});

	it("works with anchor values not present in the data", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "asc" },
			slice: { after: { yearIntroduced: 1990 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// yearIntroduced > 1990 → Smart Heart (2005)
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("returns all results when anchor is below all values", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "asc" },
			slice: { after: { yearIntroduced: 1900 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// yearIntroduced > 1900 → all bears
		expect(result).toHaveLength(4);
	});

	it("returns empty when anchor is above all values", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "asc" },
			slice: { after: { yearIntroduced: 9999 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// yearIntroduced > 9999 → nothing
		expect(result).toEqual([]);
	});

	it("respects desc order with after", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "desc" },
			slice: { after: { yearIntroduced: 1982 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// desc order: Smart Heart(2005), then 1982 bears
		// after 1982 in desc means yearIntroduced < 1982 → nothing
		expect(result).toEqual([]);
	});

	it("respects desc order with before", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { yearIntroduced: "desc" },
			slice: { before: { yearIntroduced: 1982 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// desc order: Smart Heart(2005), then 1982 bears
		// before 1982 in desc means yearIntroduced > 1982 → Smart Heart
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("combines after with offset", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { after: { name: "Cheer Bear" }, offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// name > "Cheer Bear" → [Smart Heart, Tenderheart, Wish], offset 1 → [Tenderheart, Wish]
		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});
});

// ordered by [yearIntroduced asc, name asc]:
//   Cheer Bear (1982), Tenderheart Bear (1982), Wish Bear (1982), Smart Heart Bear (2005)
describe("before/after with multi-key tuples", () => {
	it("uses tuple comparison for after with two keys", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: { after: { yearIntroduced: 1982, name: "Tenderheart Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// (year, name) > (1982, "Tenderheart Bear"):
		//   year > 1982 → Smart Heart
		//   year === 1982 AND name > "Tenderheart Bear" → Wish Bear
		expect(result).toEqual([
			{ name: "Wish Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});

	it("uses tuple comparison for before with two keys", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: { before: { yearIntroduced: 1982, name: "Tenderheart Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// (year, name) < (1982, "Tenderheart Bear"):
		//   year < 1982 → nothing
		//   year === 1982 AND name < "Tenderheart Bear" → Cheer Bear
		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("handles tuple after where first key alone is sufficient", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: { after: { yearIntroduced: 1982, name: "Wish Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// (year, name) > (1982, "Wish Bear"):
		//   year > 1982 → Smart Heart
		//   year === 1982 AND name > "Wish Bear" → nothing
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("handles tuple before + limit from end", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: {
				before: { yearIntroduced: 2005, name: "Smart Heart Bear" },
				limit: 2,
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// (year, name) < (2005, "Smart Heart Bear") → all three 1982 bears
		// limit 2 from end → [Tenderheart, Wish]
		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("handles tuple window with after and before", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: {
				after: { yearIntroduced: 1982, name: "Cheer Bear" },
				before: { yearIntroduced: 1982, name: "Wish Bear" },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// (1982, "Cheer Bear") < (year, name) < (1982, "Wish Bear")
		// → Tenderheart Bear (1982, between Cheer and Wish alphabetically)
		expect(result).toEqual([{ name: "Tenderheart Bear" }]);
	});

	it("allows after keys to be a prefix of order keys", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "asc" }],
			slice: { after: { yearIntroduced: 1982 } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// single key is a 1-prefix of the 2-key order
		// yearIntroduced > 1982 → Smart Heart
		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("handles tuple with desc on second key", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: [{ yearIntroduced: "asc" }, { name: "desc" }],
			slice: { after: { yearIntroduced: 1982, name: "Wish Bear" } },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		// order: year asc, name desc → Wish(1982), Tenderheart(1982), Cheer(1982), Smart Heart(2005)
		// (year, name) after (1982, "Tenderheart Bear") in this order:
		//   year > 1982 → Smart Heart
		//   year === 1982 AND name desc-after "Wish Bear" → name < "Wish Bear" → Tenderheart Bear, Cheer Bear
		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});
});

describe("before/after validation", () => {
	it("rejects before without order", () => {
		expect(() =>
			queryGraph(
				careBearSchema,
				{
					type: "bears",
					select: ["name"],
					slice: { before: { name: "Cheer Bear" } },
				},
				careBearData,
			),
		).toThrowError();
	});

	it("rejects after without order", () => {
		expect(() =>
			queryGraph(
				careBearSchema,
				{
					type: "bears",
					select: ["name"],
					slice: { after: { name: "Cheer Bear" } },
				},
				careBearData,
			),
		).toThrowError();
	});

	it("rejects before/after keys that are not in order", () => {
		expect(() =>
			queryGraph(
				careBearSchema,
				{
					type: "bears",
					select: ["name"],
					order: { yearIntroduced: "asc" },
					slice: { after: { name: "Cheer Bear" } },
				},
				careBearData,
			),
		).toThrowError();
	});

	it("rejects before/after keys that are not a prefix of order", () => {
		expect(() =>
			queryGraph(
				careBearSchema,
				{
					type: "bears",
					select: ["name"],
					order: [{ yearIntroduced: "asc" }, { name: "asc" }],
					slice: { after: { name: "Cheer Bear" } },
				},
				careBearData,
			),
		).toThrowError();
	});

	it("rejects before/after keys that are not valid attributes", () => {
		expect(() =>
			queryGraph(
				careBearSchema,
				{
					type: "bears",
					select: ["name"],
					order: { bogus: "asc" },
					slice: { after: { bogus: "whatever" } },
				},
				careBearData,
			),
		).toThrowError();
	});
});
