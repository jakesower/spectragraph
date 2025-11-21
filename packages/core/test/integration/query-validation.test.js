import { describe, it } from "vitest";
import { queryGraph } from "../../src/graph/query-graph.js";
import { ensureValidQueryResult } from "../../src/index.js";
import schema from "../fixtures/soccer-schema.json" with { type: "json" };
import graph from "../fixtures/soccer-fixtures.json" with { type: "json" };

/**
 * Integration tests that verify queryGraph results validate correctly.
 * These tests ensure that the query execution and result validation systems work together.
 */
describe("queryGraph result validation", () => {
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
		});

		it("empty select defaults to by fields", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup"],
				},
			};

			const result = queryGraph(schema, query, graph);
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
		});

		it("groups by multiple fields", () => {
			const query = {
				type: "matches",
				group: {
					by: ["ageGroup", "goals"],
				},
			};

			const result = queryGraph(schema, query, graph);
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
		});
	});

	describe("nested groups", () => {
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
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
			ensureValidQueryResult(schema, query, result);
		});

		it("limits and offsets groups", () => {
			const query = {
				type: "matches",
				group: {
					by: "ageGroup",
					aggregates: { count: { $count: null } },
					order: { ageGroup: "asc" },
					limit: 1,
					offset: 1,
				},
			};

			const result = queryGraph(schema, query, graph);
			ensureValidQueryResult(schema, query, result);
		});
	});
});
