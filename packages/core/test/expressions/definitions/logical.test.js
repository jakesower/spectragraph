import { describe, expect, it } from "vitest";
import { defaultExpressionEngine } from "../../../src/expressions/index.js";

const { apply, evaluate, normalizeWhereClause } = defaultExpressionEngine;

describe("$and", () => {
	it("returns true when all conditions are true", () => {
		const expression = {
			$and: [{ $gte: 4 }, { $lte: 6 }],
		};

		expect(apply(expression, 5)).toBe(true);
		expect(apply(expression, 4)).toBe(true);
		expect(apply(expression, 6)).toBe(true);
	});

	it("returns false when any condition is false", () => {
		const expression = {
			$and: [{ $gte: 4 }, { $lte: 6 }],
		};

		expect(apply(expression, 3)).toBe(false);
		expect(apply(expression, 7)).toBe(false);
	});

	it("evaluates static boolean arrays", () => {
		expect(evaluate({ $and: [true, true, true] })).toBe(true);
		expect(evaluate({ $and: [true, false, true] })).toBe(false);
		expect(evaluate({ $and: [false, false, false] })).toBe(false);
		expect(evaluate({ $and: [] })).toBe(true); // empty array
	});

	it("distributes attributes on normalizeWhereClause when phrased differently", () => {
		const where = { age: { $and: [{ $gte: 18 }, { $lt: 65 }] } };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$and: [
				{ $pipe: [{ $get: "age" }, { $gte: 18 }] },
				{ $pipe: [{ $get: "age" }, { $lt: 65 }] },
			],
		});
	});

	it("normalizes $and expressions", () => {
		const where = { $and: [{ age: { $gt: 3 } }, { activity: "playing" }] };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$and: [
				{ $pipe: [{ $get: "age" }, { $gt: 3 }] },
				{ $pipe: [{ $get: "activity" }, { $eq: "playing" }] },
			],
		});
	});

	it("normalizes nested $and expressions", () => {
		const where = {
			$and: [
				{ $or: [{ favoriteToy: "blocks" }, { favoriteToy: "dolls" }] },
				{ age: { $gte: 4 } },
			],
		};
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$and: [
				{
					$or: [
						{ $pipe: [{ $get: "favoriteToy" }, { $eq: "blocks" }] },
						{ $pipe: [{ $get: "favoriteToy" }, { $eq: "dolls" }] },
					],
				},
				{ $pipe: [{ $get: "age" }, { $gte: 4 }] },
			],
		});
	});
});

describe("$or", () => {
	it("returns true when any condition is true", () => {
		const expression = {
			$or: [{ $eq: "Ximena" }, { $eq: "Zoë" }],
		};

		expect(apply(expression, "Ximena")).toBe(true);
		expect(apply(expression, "Zoë")).toBe(true);
		expect(apply(expression, "Yousef")).toBe(false);
	});

	it("returns false when all conditions are false", () => {
		const expression = {
			$or: [{ $lt: 3 }, { $gt: 7 }],
		};

		expect(apply(expression, 5)).toBe(false);
	});

	it("evaluates static boolean arrays", () => {
		expect(evaluate({ $or: [false, false, true] })).toBe(true);
		expect(evaluate({ $or: [true, false, false] })).toBe(true);
		expect(evaluate({ $or: [false, false, false] })).toBe(false);
		expect(evaluate({ $or: [] })).toBe(false); // empty array
	});

	it("distributes attributes on normalizeWhereClause", () => {
		const where = { $or: [{ age: { $gte: 10 } }, { age: { $lt: 18 } }] };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$or: [
				{ $pipe: [{ $get: "age" }, { $gte: 10 }] },
				{ $pipe: [{ $get: "age" }, { $lt: 18 }] },
			],
		});
	});

	it("distributes attributes on normalizeWhereClause when phrased differently", () => {
		const where = { age: { $or: [{ $gte: 10 }, { $lt: 18 }] } };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$or: [
				{ $pipe: [{ $get: "age" }, { $gte: 10 }] },
				{ $pipe: [{ $get: "age" }, { $lt: 18 }] },
			],
		});
	});

	it("normalizes $or used directly in where clause", () => {
		const where = { $or: [{ age: { $gt: 18 } }, { admin: true }] };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$or: [
				{ $pipe: [{ $get: "age" }, { $gt: 18 }] },
				{ $pipe: [{ $get: "admin" }, { $eq: true }] },
			],
		});
	});

	it("normalizes $or with complex expressions", () => {
		const where = {
			$or: [
				{ age: { $gte: 21 } },
				{ $and: [{ role: "admin" }, { active: true }] },
			],
		};
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$or: [
				{ $pipe: [{ $get: "age" }, { $gte: 21 }] },
				{
					$and: [
						{ $pipe: [{ $get: "role" }, { $eq: "admin" }] },
						{ $pipe: [{ $get: "active" }, { $eq: true }] },
					],
				},
			],
		});
	});
});

describe("$not", () => {
	it("inverts boolean results", () => {
		expect(apply({ $not: { $eq: 5 } }, 5)).toBe(false);
		expect(apply({ $not: { $eq: 5 } }, 10)).toBe(true);
	});

	it("works with complex expressions", () => {
		const expression = {
			$not: { $and: [{ $gte: 4 }, { $lte: 6 }] },
		};

		expect(apply(expression, 5)).toBe(false); // 5 is between 4-6, so NOT that is false
		expect(apply(expression, 2)).toBe(true); // 2 is not between 4-6, so NOT that is true
	});

	it("evaluate with boolean value", () => {
		expect(evaluate({ $not: true })).toBe(false);
		expect(evaluate({ $not: false })).toBe(true);
	});

	it("evaluate with expression", () => {
		expect(evaluate({ $not: { $eq: [5, 5] } })).toBe(false);
		expect(evaluate({ $not: { $eq: [5, 10] } })).toBe(true);
	});

	it("distributes attributes on normalizeWhereClause when phrased differently", () => {
		const where = { active: { $not: { $eq: true } } };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$not: { $pipe: [{ $get: "active" }, { $eq: true }] },
		});
	});

	it("normalizes $not expressions", () => {
		const where = { $not: { age: { $lt: 3 } } };
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$not: { $pipe: [{ $get: "age" }, { $lt: 3 }] },
		});
	});

	it("normalizes complex nested $not expressions", () => {
		const where = {
			$not: { $and: [{ age: { $lt: 4 } }, { activity: "napping" }] },
		};
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$not: {
				$and: [
					{ $pipe: [{ $get: "age" }, { $lt: 4 }] },
					{ $pipe: [{ $get: "activity" }, { $eq: "napping" }] },
				],
			},
		});
	});
});

describe("expressions using multiple logical operators", () => {
	it("normalizes properly through multiple logical operators with mixed patterns", () => {
		const where = {
			$and: [
				{ age: { $not: { $or: [{ $lt: 1 }, { $gt: 5 }] } } },
				{ $or: [{ favoriteToy: "blocks" }, { $not: { age: { $eq: 3 } } }] },
			],
		};
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual({
			$and: [
				{
					$not: {
						$or: [
							{ $pipe: [{ $get: "age" }, { $lt: 1 }] },
							{ $pipe: [{ $get: "age" }, { $gt: 5 }] },
						],
					},
				},
				{
					$or: [
						{ $pipe: [{ $get: "favoriteToy" }, { $eq: "blocks" }] },
						{
							$not: { $pipe: [{ $get: "age" }, { $eq: 3 }] },
						},
					],
				},
			],
		});
	});

	it("preserves a mixed pattern", () => {
		const where = {
			$and: [
				{
					$not: {
						$or: [
							{ $pipe: [{ $get: "age" }, { $lt: 1 }] },
							{ $pipe: [{ $get: "age" }, { $gt: 5 }] },
						],
					},
				},
				{
					$or: [
						{ $pipe: [{ $get: "favoriteToy" }, { $eq: "blocks" }] },
						{
							$not: { $pipe: [{ $get: "age" }, { $eq: 3 }] },
						},
					],
				},
			],
		};
		const normalized = normalizeWhereClause(where);
		expect(normalized).toEqual(where);
	});
});
