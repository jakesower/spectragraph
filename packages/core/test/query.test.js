import { expect, it, describe } from "vitest";
import { ensureValidQuery, normalizeQuery } from "../src/query.js";
import careBearSchema from "./fixtures/care-bears.schema.json" with { type: "json" };

describe("ensureValidQuery", () => {
	describe("structure", () => {
		it("should validate a valid query", () => {
			expect(() =>
				ensureValidQuery(careBearSchema, { type: "bears", select: "*" }),
			).not.toThrowError();
		});

		it("should not validate a nonobject query", () => {
			expect(() => ensureValidQuery(careBearSchema, "hi")).toThrowError();
		});

		it("should not validate a query that's an array", () => {
			expect(() => ensureValidQuery(careBearSchema, ["hi"])).toThrowError();
		});
	});

	describe("select", () => {
		it("fails validation when selecting a string that's not *", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: { select: "id" } },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("fails validation when selecting an array containing a string that's not * or an attribute", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: { select: ["noperz"] } },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("passes validation when selecting an object with a strange value for the * key", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { "*": ["hello"] },
				};

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("fails validation when selecting an object a misc key pointing to a non-attribute or expression", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: { select: { boy: "howdy", name: "name" } } },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("passes validation when selecting an object a misc key pointing to an attribute", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: { select: { boy: "name", name: "name" } } },
				};

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("fails validation when selecting an object with a key that's a relationship name pointing to an attribute", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: "name" },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("fails validation when selecting an object with a key that's not relationship name pointing to a subquery", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { home: { select: { boy: { select: ["name"] } } } },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("passes validation when selecting an expression with a misc key", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { chicken: { $max: [2, 3] } },
				};

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("fails validation when selecting an invalid expression with a misc key", () => {
			expect(() => {
				const query = {
					type: "bears",
					id: "1",
					select: { chicken: { $notAnExpression: [2, 3] } },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});
	});

	describe("limit/offset", () => {
		it("fails validation when using a bad value for limit", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["id"],
					limit: 0,
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("fails validation when using a bad value for offset", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["id"],
					limit: 3,
					offset: -1,
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});
	});

	describe("order", () => {
		it("passes validation when using a correct query", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: {
						name: "name",
						yearIntroduced: "yearIntroduced",
						home: { select: ["name"] },
					},
					order: [{ yearIntroduced: "desc" }, { name: "asc" }],
				};

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("fails validation when using an invalid attribute", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["name"],
					order: { lol: "asc" },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("fails validation when using an order with two keys", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["name"],
					order: { name: "asc", bellyBadge: "desc" },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});
	});

	describe("where", () => {
		it("passes validation when using a correct query", () => {
			expect(() => {
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

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("fails validation when using an invalid attribute", () => {
			expect(() => {
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

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
		});

		it("passes validation when using a valid expression for the value", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["name"],
					where: { $gt: 2 },
				};

				ensureValidQuery(careBearSchema, query);
			}).not.toThrowError();
		});

		it("false validation when using something that looks like a valid expression for the value, but isn't", () => {
			expect(() => {
				const query = {
					type: "bears",
					select: ["name"],
					where: { $notAnExpression: 2 },
				};

				ensureValidQuery(careBearSchema, query);
			}).toThrowError();
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
