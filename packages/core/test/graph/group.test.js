import { describe, it, expect } from "vitest";
import { queryGraph } from "../../src/graph/query-graph.js";
import schema from "../fixtures/soccer-schema.json" with { type: "json" };
import graph from "../fixtures/soccer-fixtures.json" with { type: "json" };

describe("group queries", () => {
	describe("grand totals (by: [])", () => {
		it("aggregates all resources into a single group", () => {
			const query = {
				type: "matches",
				group: {
					by: [],
					aggregates: {
						totalMatches: { $count: null },
						totalGoals: { $sum: { $pluck: "goals" } },
						avgGoals: { $mean: { $pluck: "goals" } },
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{
					totalMatches: 4,
					totalGoals: 9,
					avgGoals: 2.25,
				},
			]);
		});

		it("supports select with by: []", () => {
			const query = {
				type: "matches",
				group: {
					by: [],
					select: {
						summary: { $if: { if: true, then: "All Matches", else: "" } },
					},
					aggregates: {
						count: { $count: null },
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([{ summary: "All Matches", count: 4 }]);
		});

		it("supports nested grouping with by: [] as final grand total", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { groupGoals: { $sum: { $pluck: "goals" } } },
					group: {
						by: [],
						aggregates: {
							totalAgeGroups: { $count: null },
							grandTotalGoals: { $sum: { $pluck: "groupGoals" } },
						},
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{
					totalAgeGroups: 3,
					grandTotalGoals: 9,
				},
			]);
		});
	});

	describe("select", () => {
		it("groups by a single field with explicit select", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					select: ["ageGroup"],
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11 },
				{ ageGroup: 12 },
				{ ageGroup: 13 },
			]);
		});

		it("empty select defaults to by fields", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11 },
				{ ageGroup: 12 },
				{ ageGroup: 13 },
			]);
		});

		it("select can override/rename group fields", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					select: { age: "ageGroup" },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([{ age: 11 }, { age: 12 }, { age: 13 }]);
		});

		it("groups by multiple fields", () => {
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
				{ ageGroup: 13, goals: 3 },
			]);
		});

		it("select with wildcard includes all by fields", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					select: ["*"],
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11 },
				{ ageGroup: 12 },
				{ ageGroup: 13 },
			]);
		});

		it("select can include computed fields", () => {
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
				{ ageGroup: 13, tier: "senior" },
			]);
		});

		it("select can omit some by fields", () => {
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
				{ ageGroup: 13 },
			]);
		});
	});

	describe("aggregates", () => {
		it("does a simple count aggregate", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					select: ["ageGroup"],
					aggregates: { total: { $count: null } },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11, total: 2 },
				{ ageGroup: 12, total: 1 },
				{ ageGroup: 13, total: 1 },
			]);
		});

		it("aggregates over attribute values", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { totalGoals: { $sum: { $pluck: "goals" } } },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11, totalGoals: 4 },
				{ ageGroup: 12, totalGoals: 2 },
				{ ageGroup: 13, totalGoals: 3 },
			]);
		});

		it("combines select and aggregates", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					select: { age: "ageGroup" },
					aggregates: { count: { $count: null } },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ age: 11, count: 2 },
				{ age: 12, count: 1 },
				{ age: 13, count: 1 },
			]);
		});
	});

	describe("groups", () => {
		it("regroups as a noop", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					select: ["ageGroup"],
					group: {
						by: ["ageGroup"],
						select: ["ageGroup"],
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11 },
				{ ageGroup: 12 },
				{ ageGroup: 13 },
			]);
		});

		it("regroups based on a computed select", () => {
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
					group: {
						by: "tier",
						aggregates: { count: { $count: null } },
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ tier: "junior", count: 1 },
				{ tier: "senior", count: 2 },
			]);
		});

		it("regroups based on an aggregate", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
					aggregates: { totalGoals: { $sum: { $pluck: "goals" } } },
					group: {
						by: ["totalGoals"],
						aggregates: {
							goalAgeGroups: { $pluck: "ageGroup" },
						},
					},
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ totalGoals: 4, goalAgeGroups: [11] },
				{ totalGoals: 2, goalAgeGroups: [12] },
				{ totalGoals: 3, goalAgeGroups: [13] },
			]);
		});
	});

	describe("top-level clauses on grouped queries", () => {
		it("orders groups", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { total: { $sum: { $pluck: "goals" } } },
					order: { total: "desc" },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11, total: 4 },
				{ ageGroup: 13, total: 3 },
				{ ageGroup: 12, total: 2 },
			]);

			const query2 = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { total: { $sum: { $pluck: "goals" } } },
					order: { total: "asc" },
				},
			};

			const result2 = queryGraph(schema, query2, graph);

			expect(result2).toEqual([
				{ ageGroup: 12, total: 2 },
				{ ageGroup: 13, total: 3 },
				{ ageGroup: 11, total: 4 },
			]);
		});

		it("filters groups with group-level where", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { total: { $sum: { $pluck: "goals" } } },
					where: { $gt: [{ $get: "total" }, 2] },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([
				{ ageGroup: 11, total: 4 },
				{ ageGroup: 13, total: 3 },
			]);
		});

		it("limits and offsets groups", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { count: { $count: null } },
					order: { ageGroup: "asc" },
					slice: { limit: 1, offset: 1 },
				},
			};

			const result = queryGraph(schema, query, graph);
			expect(result).toEqual([{ ageGroup: 12, count: 1 }]);

			const query2 = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { count: { $count: null } },
					order: { ageGroup: "asc" },
					slice: { limit: 1 },
				},
			};

			const result2 = queryGraph(schema, query2, graph);

			expect(result2).toEqual([{ ageGroup: 11, count: 2 }]);
		});
	});
});
