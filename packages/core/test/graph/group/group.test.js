import { describe, test, expect } from "vitest";
import { queryGraph } from "../../../src/graph/query-graph.js";
import schema from "../../fixtures/soccer-schema.json" with { type: "json" };
import graph from "../../fixtures/soccer-fixtures.json" with { type: "json" };

describe("group queries", () => {
	test("groups by a single field with explicit select", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup"],
				select: ["ageGroup"],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([{ ageGroup: 11 }, { ageGroup: 12 }]);
	});

	test("empty select defaults to by fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup"],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([{ ageGroup: 11 }, { ageGroup: 12 }]);
	});

	test("select can override/rename group fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup"],
				select: { age: "ageGroup" },
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([{ age: 11 }, { age: 12 }]);
	});

	test("groups by multiple fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup", "goals"],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([
			{ ageGroup: 11, goals: 3 },
			{ ageGroup: 11, goals: 1 },
			{ ageGroup: 12, goals: 2 },
		]);
	});

	test("select with wildcard includes all by fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup"],
				select: ["*"],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([{ ageGroup: 11 }, { ageGroup: 12 }]);
	});

	test("select can include computed fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup"],
				select: [
					"ageGroup",
					{
						tier: {
							$if: {
								if: { $gte: [{ $get: "ageGroup" }, 12] },
								then: "senior",
								else: "junior",
							},
						},
					},
				],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([
			{ ageGroup: 11, tier: "junior" },
			{ ageGroup: 12, tier: "senior" },
		]);
	});

	test("select can omit some by fields", () => {
		const query = {
			type: "matches",
			group: {
				by: ["ageGroup", "goals"],
				select: ["ageGroup"],
			},
		};

		const result = queryGraph(schema, query, graph);

		expect(result).toEqual([
			{ ageGroup: 11 },
			{ ageGroup: 11 },
			{ ageGroup: 12 },
		]);
	});
});
