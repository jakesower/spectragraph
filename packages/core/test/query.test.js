import { expect, it, describe } from "vitest";
import { normalizeQuery, validateQuery } from "../src/query.js";
import { careBearSchema } from "../interface-tests/src/index.js";
import { defaultExpressionEngine } from "../src/index.js";

describe("validateQuery", () => {
	describe("structure", () => {
		it("should validate a valid query", () => {
			const query = { type: "bears", select: "*" };
			const result = validateQuery(careBearSchema, query);
			expect(result).toEqual([]);
		});

		it("should validate a valid query in mixed array/object form", () => {
			const query = {
				type: "bears",
				select: [
					"*",
					{ home: { select: ["name", { residents: { select: ["name"] } }] } },
				],
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("should validate a valid query in another mixed array/object form", () => {
			const query = {
				type: "homes",
				select: {
					id: "id",
					residents: {
						select: [
							"name",
							{
								home: { select: ["name"] },
								powers: { select: { name: "name" } },
							},
						],
					},
				},
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("should validate a valid query with a nested limit", () => {
			const query = {
				type: "homes",
				select: {
					id: "id",
					residents: {
						select: ["name"],
						limit: 3,
					},
				},
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("should not validate a nonobject query", () => {
			const query = "hi";
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("should not validate a query that's an array", () => {
			const result = validateQuery(careBearSchema, [
				{ type: "bears", select: "*" },
			]);
			expect(result.length).toBeGreaterThan(0);
		});

		it("should not validate a query that doesn't have a select clause", () => {
			const result = validateQuery(careBearSchema, { type: "bears" });
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("select", () => {
		it("fails validation when selecting a string that's not *", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: "id" } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when selecting an array containing a string that's not * or an attribute", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: ["noperz"] } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when selecting an object containing a string not an attribute", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: { noperz: "noperz" } } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when selecting a deeply nested object containing a string not an attribute", () => {
			const query = {
				type: "bears",
				id: "1",
				select: ["name", { home: { select: { noperz: "noperz" } } }],
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when selecting an array containing a string that's a relationship", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: ["residents"] } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation when selecting an object with a strange value for the * key", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { "*": ["hello"] },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("fails validation when selecting an object a misc key pointing to a non-attribute or expression", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: { boy: "howdy", name: "name" } } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation when selecting an object a misc key pointing to an attribute", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: { boy: "name", name: "name" } } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("fails validation when selecting an object with a key that's a relationship name pointing to an attribute", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: "name" },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when selecting an object with a key that's not a relationship name pointing to a subquery", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { home: { select: { boy: { select: ["name"] } } } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("passes validation when selecting an expression with a misc key", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { chicken: { $max: [2, 3] } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("passes validation when selecting an invalid expression with a misc key (non-strict mode)", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { chicken: { $notAnExpression: [2, 3] } },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("fails validation when selecting an invalid expression with a misc key (strict mode)", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { chicken: { $notAnExpression: [2, 3] } },
			};
			const result = validateQuery(careBearSchema, query, {
				expressionEngine: defaultExpressionEngine,
			});
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("limit/offset", () => {
		it("fails validation when using a bad value for limit", () => {
			const query = {
				type: "bears",
				select: ["id"],
				limit: 0,
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when using a bad value for offset", () => {
			const query = {
				type: "bears",
				select: ["id"],
				limit: 3,
				offset: -1,
			};
			const result = validateQuery(careBearSchema, query, {
				expressionEngine: defaultExpressionEngine,
			});
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].code).toEqual("minimum");
		});
	});

	describe("order", () => {
		it("passes validation when using a correct query", () => {
			const query = {
				type: "bears",
				select: {
					name: "name",
					yearIntroduced: "yearIntroduced",
					home: { select: ["name"] },
				},
				order: [{ yearIntroduced: "desc" }, { name: "asc" }],
			};
			const result = validateQuery(careBearSchema, query);
			expect(result).toEqual([]);
		});

		it("fails validation when using an invalid attribute", () => {
			const query = {
				type: "bears",
				select: ["name"],
				order: { lol: "asc" },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it("fails validation when using an order with two keys", () => {
			const query = {
				type: "bears",
				select: ["name"],
				order: { name: "asc", bellyBadge: "desc" },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("where", () => {
		it("passes validation when using a correct query", () => {
			const query = {
				type: "bears",
				select: {
					name: "name",
					yearIntroduced: "yearIntroduced",
					home: { select: ["name"] },
				},
				where: {
					name: "Tenderheart Bear",
				},
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("passes validation when using an invalid attribute that looks like an expression", () => {
			const query = {
				type: "bears",
				select: {
					name: "name",
					yearIntroduced: "yearIntroduced",
					home: { select: ["name"] },
				},
				where: {
					notAnAttribute: "value",
				},
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("passes validation when using a valid expression for the value", () => {
			const query = {
				type: "bears",
				select: ["name"],
				where: { $gt: 2 },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("passes validation when using something that looks like a valid expression for the value, but isn't", () => {
			const query = {
				type: "bears",
				select: ["name"],
				where: { $notAnExpression: 2 },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		describe("when providing an expressionEngine", () => {
			it("fails validation when using an invalid attribute that looks like an expression", () => {
				const query = {
					type: "bears",
					select: {
						name: "name",
						yearIntroduced: "yearIntroduced",
						home: { select: ["name"] },
					},
					where: {
						notAnAttribute: "value",
					},
				};
				const result = validateQuery(careBearSchema, query, {
					expressionEngine: defaultExpressionEngine,
				});
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when using something that looks like a valid expression for the value, but isn't", () => {
				const query = {
					type: "bears",
					select: ["name"],
					where: { $notAnExpression: 2 },
				};
				const result = validateQuery(careBearSchema, query, {
					expressionEngine: defaultExpressionEngine,
				});
				expect(result.length).toBeGreaterThan(0);
			});
		});
	});
});

describe("normalizeQuery", () => {
	it("adds type to subqueries", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: ["id"] } },
		});

		expect(normal.select.home.type).toEqual("homes");
	});

	it("expands * strings in select", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: "*" } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});

	it("expands * strings in arrays", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: ["*"] } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});

	it("expands * strings in select", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { select: { "*": true } } },
		});

		expect(normal.select.home.select).toEqual({
			id: "id",
			name: "name",
			location: "location",
			caringMeter: "caringMeter",
			isInClouds: "isInClouds",
		});
	});
});
