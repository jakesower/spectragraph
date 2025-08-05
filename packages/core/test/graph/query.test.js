import { expect, it, describe } from "vitest";
import { createQueryGraph, queryGraph } from "../../src/graph.js";
import { ensureValidQueryResult } from "../../src/resource.js";
import careBearsSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import careBearData from "../fixtures/care-bear-data.json" with { type: "json" };

const graph = createQueryGraph(careBearsSchema, careBearData);

describe("queryTree core", () => {
	it("fetches a single resource with array notation", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["name"],
		};

		const result = graph.query(query);

		expect(result).toEqual({ name: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource with object notation", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: { name: "name" },
		};

		const result = graph.query(query);

		expect(result).toEqual({ name: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("using the immediate evaluation function", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["name"],
		};

		const result = queryGraph(careBearsSchema, careBearData, query);

		expect(result).toEqual({ name: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource with mixed notation", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["name", { yearIntroduced: "yearIntroduced" }],
		};

		const result = graph.query(query);

		expect(result).toEqual({
			name: "Tenderheart Bear",
			yearIntroduced: 1982,
		});
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource with its id", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["id", "name"],
		};

		const result = graph.query(query);

		expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource without its id", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["name"],
		};

		const result = graph.query(query);

		expect(result).toEqual({ name: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource and maps property names", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: {
				nombre: "name",
			},
		};

		const result = graph.query(query);

		expect(result).toEqual({ nombre: "Tenderheart Bear" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a property from multiple resources", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
		};

		const result = graph.query(query);

		const expected = [
			"Tenderheart Bear",
			"Cheer Bear",
			"Wish Bear",
			"Smart Heart Bear",
		].map((name) => ({ name }));

		expect(result).toEqual(expected);
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches null for a nonexistent resource", async () => {
		const query = {
			type: "bears",
			id: "6",
			select: ["id"],
		};

		const result = graph.query(query);

		expect(result).toEqual(null);
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("disallows queries with no 'type'", async () => {
		await expect(async () => {
			graph.query({
				select: ["name"],
			});
		}).rejects.toThrowError();
	});

	it("fetches a single resource with a many-to-one relationship", async () => {
		const q = {
			type: "bears",
			id: "1",
			select: { home: { select: ["id"] } },
		};

		const result = graph.query(q);

		expect(result).toEqual({
			home: { id: "1" },
		});
	});

	it("a single resource with a one-to-many relationship", async () => {
		const q = {
			type: "homes",
			id: "1",
			select: { residents: { select: ["id"] } },
		};

		const result = await graph.query(q);

		expect(result).toEqual({
			residents: [{ id: "1" }, { id: "2" }, { id: "3" }],
		});
	});

	it("fetches a single resource with a subset of props", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: ["id", "name", "furColor"],
		};

		const result = graph.query(query);

		expect(result).toEqual({
			id: "1",
			name: "Tenderheart Bear",
			furColor: "tan",
		});
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource with a subset of props on a relationship", async () => {
		const q = {
			type: "bears",
			id: "1",
			select: { home: { select: { caringMeter: "caringMeter" } } },
		};

		const result = await graph.query(q);

		expect(result).toEqual({ home: { caringMeter: 1 } });
	});

	it("uses explicitly set id fields", async () => {
		const query = {
			type: "powers",
			id: "careBearStare",
			select: {
				powerId: "powerId",
			},
		};

		const result = await graph.query(query);

		expect(result).toEqual({ powerId: "careBearStare" });
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches a single resource with many-to-many relationship and a `type` property", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: { powers: { select: ["type"] } },
		};

		const result = await graph.query(query);

		expect(result).toEqual({
			powers: [{ type: "group power" }],
		});
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("fetches multiple subqueries of various types", async () => {
		const query = {
			type: "bears",
			id: "1",
			select: {
				home: {
					select: ["name"],
				},
				powers: { select: "*" },
			},
		};

		const result = await graph.query(query);

		expect(result).toEqual({
			home: {
				name: "Care-a-Lot",
			},
			powers: [
				{
					description: "Purges evil.",
					name: "Care Bear Stare",
					powerId: "careBearStare",
					type: "group power",
				},
			],
		});
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("handles subqueries between the same type", async () => {
		const query = {
			type: "bears",
			select: {
				id: "id",
				bestFriend: { select: ["id"] },
			},
		};

		const result = await graph.query(query);

		expect(result).toEqual([
			{ id: "1", bestFriend: null },
			{ id: "2", bestFriend: { id: "3" } },
			{ id: "3", bestFriend: { id: "2" } },
			{ id: "5", bestFriend: null },
		]);
		expect(() => {
			ensureValidQueryResult(careBearsSchema, query, result);
		});
	});

	it("errors out on undefined resources", async () => {
		await expect(async () => {
			const graph = {
				...careBearData,
				bears: {
					...careBearData.bears,
					1: {
						...careBearData.bears[1],
						relationships: {},
					},
				},
			};

			queryGraph(graph, {
				type: "bears",
				id: "1",
				select: {
					name: "name",
					home: { select: ["name"] },
				},
			});
		}).rejects.toThrowError();
	});
});
