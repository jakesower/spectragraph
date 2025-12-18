import { expect, it, describe } from "vitest";
import { careBearSchema } from "../interface-tests/src/index.js";
import {
	defaultSelectEngine,
	defaultWhereEngine,
} from "../src/lib/defaults.js";
import { normalizeQuery } from "../src/query/normalize-query.js";
import {
	validateQuery,
	getQueryExtent,
	getFullQueryExtent,
} from "../src/query.js";
import { ensure } from "../src/lib/helpers.js";

const ensureValidQuery = ensure(validateQuery);

describe("validateQuery", () => {
	describe("structure", () => {
		it("should validate a valid query", () => {
			const query = { type: "bears", select: "*" };
			const result = validateQuery(careBearSchema, query);
			expect(result).toEqual([]);
		});

		it("should validate a query with ids", () => {
			const query = { type: "bears", ids: ["1", "2"], select: "*" };
			const result = validateQuery(careBearSchema, query);
			expect(result).toEqual([]);
		});

		it("should not validate a query with both id and ids", () => {
			const query = { type: "bears", id: "1", ids: ["2"], select: "*" };
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
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

		it("should validate with nested select shorthand", () => {
			const query = {
				type: "bears",
				select: { home: ["name"] },
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

		it("fails validation when selecting an invalid expression", () => {
			const query = {
				type: "bears",
				id: "1",
				select: { chicken: { $notAnExpression: [2, 3] } },
			};
			const result = validateQuery(careBearSchema, query);
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
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
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

		it("fails validation when using an invalid attribute", () => {
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
			expect(result.length).toBeGreaterThan(0);
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

		it("fails validation when using an invalid expression", () => {
			const query = {
				type: "bears",
				select: ["name"],
				where: { $notAnExpression: 2 },
			};
			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("group", () => {
		it("validates with a simple valid group string", () => {
			const query = {
				type: "bears",
				group: { by: "yearIntroduced" },
			};

			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("validates with a simple valid group array", () => {
			const query = {
				type: "bears",
				group: { by: ["yearIntroduced"] },
			};

			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it('does not validate with a group with no "by" clause', () => {
			const query = {
				type: "matches",
				group: {},
			};

			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		it('validates with an empty array "by" clause for grand totals', () => {
			const query = {
				type: "bears",
				group: {
					by: [],
					aggregates: { totalBears: { $count: null } },
				},
			};

			const result = validateQuery(careBearSchema, query);
			expect(result.length).toEqual(0);
		});

		it("does not validate with an array aggregates clause", () => {
			const query = {
				type: "matches",
				group: { by: [], aggregates: [] },
			};

			const result = validateQuery(careBearSchema, query);
			expect(result.length).toBeGreaterThan(0);
		});

		describe("group.aggregates", () => {
			it("does not validate with a string aggregates clause", () => {
				const query = {
					type: "bears",
					group: { by: "yearIntroduced", aggregates: "invalid" },
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("does not validate with non-expression aggregates values", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { total: "notAnExpression" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("validates with valid aggregates", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: null } },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation on nonexistant nested paths from group.aggregates", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							homeNames: { $pluck: "home.helloWorld" },
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation on badly nested paths from group.aggregates", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							homeNames: { $pluck: { $get: "home.name" } }, // $get nested in $pluck
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when aggregate references valid attribute", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							names: { $pluck: "name" },
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("passes validation when aggregate references valid relationship", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							homeNames: { $pluck: "home.name" },
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when aggregate references invalid attribute", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							invalid: { $pluck: "notAnAttribute" },
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when aggregate uses complex expression with valid paths", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							powerCount: {
								$sum: {
									$pipe: [{ $get: "powers" }, { $count: null }],
								},
							},
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when aggregate expression references invalid nested path", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: {
							invalid: {
								$pluck: "home.invalidField",
							},
						},
					},
				};
				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});

		describe("group.select", () => {
			it("fails validation when grouping by an invalid attribute", () => {
				const query = {
					type: "bears",
					group: { by: "notAnAttribute" },
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when selecting an invalid attribute", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["notAnAttribute"],
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when selecting a relationship", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["home"],
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when selecting valid expressions", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { computed: { $add: [1, 2] } },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when selecting invalid expressions", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { computed: { $notAnExpression: [1, 2] } },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when selecting a string attribute that's in the by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { year: "yearIntroduced" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when selecting a string attribute that's not in the by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { badge: "bellyBadge" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when selecting an expression that only references attributes from the by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { doubled: { $multiply: [{ $get: "yearIntroduced" }, 2] } },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when selecting an expression that references attributes not in the by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { upperName: { $uppercase: { $get: "name" } } },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when selecting an expression with nested $get referencing non-by field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: {
							computed: {
								$pipe: [{ $get: "bellyBadge" }, { $uppercase: null }],
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when selecting an expression with $if referencing non-by field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: {
							computed: {
								$if: {
									if: { $gt: [{ $get: "bellyBadge" }, "star"] },
									then: "cool",
									else: "not cool",
								},
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when selecting expression with multiple references all in by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: ["yearIntroduced", "bellyBadge"],
						select: {
							combined: {
								$concat: [
									{ $get: "yearIntroduced" },
									"-",
									{ $get: "bellyBadge" },
								],
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when one of multiple expression references is not in by clause", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: {
							combined: {
								$concat: [{ $get: "yearIntroduced" }, "-", { $get: "name" }],
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});

		describe("group.where (HAVING)", () => {
			it("passes validation with valid expression", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						where: { $gt: [{ $get: "count" }, 5] },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation with invalid expression", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						where: { $notAnExpression: 2 },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});

		describe("group.order", () => {
			it("passes validation when ordering by select field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["yearIntroduced"],
						order: { yearIntroduced: "asc" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("passes validation when ordering by aggregate field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						order: { count: "desc" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when ordering by field not in select or aggregates", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["yearIntroduced"],
						order: { notAField: "asc" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation with order object containing multiple keys", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						order: { yearIntroduced: "asc", name: "desc" },
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});

		describe("group.limit/offset", () => {
			it("fails validation when limit is less than 1", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						limit: 0,
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when offset is negative", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						offset: -1,
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});

		describe("group.group (nested grouping)", () => {
			it("validates nested group with valid by field from parent select", () => {
				const query = {
					type: "bears",
					group: {
						by: ["yearIntroduced", "bellyBadge"],
						select: ["yearIntroduced", "bellyBadge"],
						group: {
							by: "bellyBadge",
							aggregates: { count: { $count: {} } },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("validates nested group with by field from parent aggregates", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { total: { $count: {} } },
						group: {
							by: "total",
							aggregates: { years: { $pluck: "yearIntroduced" } },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("validates nested group with computed field from parent select", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: {
							year: "yearIntroduced",
							era: {
								$if: {
									if: { $gte: [{ $get: "yearIntroduced" }, 1985] },
									then: "modern",
									else: "classic",
								},
							},
						},
						group: {
							by: "era",
							aggregates: { count: { $count: {} } },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when nested by references field not in parent output", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["yearIntroduced"],
						group: {
							by: "bellyBadge",
							aggregates: { count: { $count: {} } },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when nested by references original resource attribute", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						group: {
							by: "name", // 'name' is a resource attribute, not in parent output
							aggregates: { total: { $sum: { $get: "count" } } },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("validates deeply nested grouping", () => {
				const query = {
					type: "bears",
					group: {
						by: ["yearIntroduced", "bellyBadge"],
						select: ["yearIntroduced", "bellyBadge"],
						group: {
							by: "bellyBadge",
							aggregates: { count: { $count: {} } },
							group: {
								by: "count",
								aggregates: { badges: { $pluck: "bellyBadge" } },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when nested group aggregates contains a non-expression value", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: ["yearIntroduced"],
						aggregates: { count: { $count: {} } },
						group: {
							by: "count",
							aggregates: {
								invalidValue: "notAnExpression",
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when nested group select references parent by field", () => {
				const query = {
					type: "bears",
					group: {
						by: ["yearIntroduced", "bellyBadge"],
						aggregates: { count: { $count: {} } },
						group: {
							by: "bellyBadge",
							select: { badge: "bellyBadge" },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("passes validation when nested group select references parent aggregate", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { total: { $count: {} } },
						group: {
							by: "total",
							select: { theTotal: "total" },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when nested group select references field not in parent output", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						group: {
							by: "count",
							select: { invalidRef: "bellyBadge" },
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when nested group aggregate references parent select field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { year: "yearIntroduced" },
						aggregates: { count: { $count: {} } },
						group: {
							by: "year",
							aggregates: {
								years: { $pluck: "year" },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("passes validation when nested group aggregate references parent aggregate field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { total: { $count: {} } },
						group: {
							by: "yearIntroduced",
							aggregates: {
								maxTotal: { $max: { $pluck: "total" } },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when nested group aggregate references invalid parent field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						group: {
							by: "yearIntroduced",
							aggregates: {
								invalid: { $pluck: "notAField" },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("fails validation when nested group aggregate uses dotted path reference", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						select: { year: "yearIntroduced" },
						aggregates: { count: { $count: {} } },
						group: {
							by: "year",
							aggregates: {
								invalid: { $get: "year.something" },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});

			it("passes validation when nested group select uses expression referencing parent by field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						group: {
							by: "yearIntroduced",
							select: {
								doubled: { $multiply: [{ $get: "yearIntroduced" }, 2] },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toEqual(0);
			});

			it("fails validation when nested group select expression references non-by field", () => {
				const query = {
					type: "bears",
					group: {
						by: "yearIntroduced",
						aggregates: { count: { $count: {} } },
						group: {
							by: "yearIntroduced",
							select: {
								invalid: { $get: "count" },
							},
						},
					},
				};

				const result = validateQuery(careBearSchema, query);
				expect(result.length).toBeGreaterThan(0);
			});
		});
	});

	describe("real world issues", () => {
		it('can "double normalize" queries', () => {
			const selectEngine = defaultSelectEngine;
			const whereEngine = defaultWhereEngine;

			const query = {
				type: "homes",
				id: undefined,
				select: ["*", { residents: "*" }],
			};

			const normalQuery = normalizeQuery(careBearSchema, query, {
				selectEngine,
				whereEngine,
			});

			ensureValidQuery(careBearSchema, normalQuery, {
				selectEngine,
				whereEngine,
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

	it("normalizes select array shorthand in subqueries", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: ["id"] },
		});

		expect(normal.select.home).toEqual({
			type: "homes",
			select: { id: "id" },
		});
	});

	it("normalizes select object shorthand in subqueries", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: { id: "id" } },
		});

		expect(normal.select.home).toEqual({
			type: "homes",
			select: { id: "id" },
		});
	});

	it("normalizes select object with * as subquery", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: { home: "*" },
		});

		expect(normal.select.home).toEqual({
			type: "homes",
			select: {
				id: "id",
				name: "name",
				location: "location",
				caringMeter: "caringMeter",
				isInClouds: "isInClouds",
			},
		});
	});

	it("normalizes select object * and with * as subquery", () => {
		const normal = normalizeQuery(careBearSchema, {
			type: "bears",
			select: ["*", { home: "*" }],
		});

		expect(normal.select.home).toEqual({
			type: "homes",
			select: {
				id: "id",
				name: "name",
				location: "location",
				caringMeter: "caringMeter",
				isInClouds: "isInClouds",
			},
		});
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

describe("getQueryExtent", () => {
	describe("simple attribute selection", () => {
		it("returns root attributes", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toEqual(["name", "yearIntroduced"]);
		});

		it("handles star expansion", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: "*",
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("bellyBadge");
		});
	});

	describe("relationship selection", () => {
		it("returns relationship paths", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					home: { select: { name: "name" } },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
			expect(extent).toContain("home.name");
		});

		it("handles nested relationships", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					home: {
						select: {
							name: "name",
							residents: { select: { name: "name" } },
						},
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
			expect(extent).toContain("home.name");
			expect(extent).toContain("home.residents.name");
		});
	});

	describe("$get expression", () => {
		it("extracts simple property paths", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					displayName: { $get: "name" },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
		});

		it("extracts nested property paths", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					homeName: { $get: "home.name" },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home.name");
		});

		it("strips $ wildcard from paths", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					powerNames: { $get: "powers.$.name" },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers.name");
		});
	});

	describe("$matchesAll expression", () => {
		it("extracts properties from match object", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					isMatch: {
						$matchesAll: {
							name: "Tenderheart Bear",
							yearIntroduced: 1983,
						},
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
			expect(extent).toContain("yearIntroduced");
		});
	});

	describe("$exists expression", () => {
		it("extracts property path", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					hasHome: { $exists: "home" },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home");
		});

		it("extracts nested property path", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					hasHomeName: { $exists: "home.name" },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home.name");
		});
	});

	describe("complex expressions", () => {
		it("handles $pipe with $get", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					upperName: {
						$pipe: [{ $get: "name" }, { $uppercase: null }],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("name");
		});

		it("handles $pipe with $get and $matchesAll", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					livesInCaringPlace: {
						$pipe: [
							{ $get: "home" },
							{ $matchesAll: { caringMeter: { $gt: 50 }, isInClouds: true } },
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home");
			expect(extent).toContain("home.caringMeter");
			expect(extent).toContain("home.isInClouds");
		});

		it("handles $pipe with $get, $matchesAll, with a second $get cherry on top", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					livesInFriendlyPlace: {
						$pipe: [
							{ $get: "home" },
							{
								$and: [
									{
										$matchesAll: {
											caringMeter: { $eq: { $count: { $get: "bears" } } },
											isInClouds: true,
										},
									},
									{ $gt: [{ $count: { $get: "bears" } }, 3] },
								],
							},
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home");
			expect(extent).toContain("home.caringMeter");
			expect(extent).toContain("home.isInClouds");
			expect(extent).toContain("home.bears");
		});

		it("handles a $matchesAll -> $get -> $matchesAny pattern", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					caringEnough: {
						$matchesAll: {
							bellyBadge: { $not: "heart" },
							home: {
								$matchesAny: {
									caringMeter: { $gt: 0.5 },
									isInClouds: true,
								},
							},
						},
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("bellyBadge");
			expect(extent).toContain("home");
			expect(extent).toContain("home.caringMeter");
			expect(extent).toContain("home.isInClouds");
		});

		it("handles $filter with property access", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					oldPowers: {
						$pipe: [
							{ $get: "powers" },
							{
								$filter: { $pipe: [{ $get: "yearIntroduced" }, { $lt: 1985 }] },
							},
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
		});

		it("handles $pluck", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					powerNames: {
						$pipe: [{ $get: "powers" }, { $pluck: "name" }],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.name");
		});

		it("handles $sort with string property", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					sortedPowers: {
						$pipe: [{ $get: "powers" }, { $sort: { by: "name" } }],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.name");
		});

		it("handles $sort with expression property", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					sortedPowers: {
						$pipe: [{ $get: "powers" }, { $sort: { by: { $get: "name" } } }],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.name");
		});

		it("handles $groupBy with string property", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					groupedByYear: {
						$pipe: [{ $get: "powers" }, { $groupBy: "yearIntroduced" }],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
		});

		it("handles $groupBy with expression property", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					groupedByYear: {
						$pipe: [
							{ $get: "powers" },
							{ $groupBy: { $get: "yearIntroduced" } },
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
		});
	});

	describe("deduplication", () => {
		it("removes duplicate paths", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					upperName: { $uppercase: { $get: "name" } },
					lowerName: { $lowercase: { $get: "name" } },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			const nameCount = extent.filter((p) => p === "name").length;
			expect(nameCount).toBe(1);
		});
	});

	describe("edge cases", () => {
		it("handles expressions that don't reference properties", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					literalValue: { $literal: { foo: "bar" } },
					computed: { $add: [1, 2] },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toEqual([]);
		});

		it("handles array paths in $get", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					homeName: { $get: ["home", "name"] },
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("home.name");
		});

		it("handles nested $pipe expressions", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					complex: {
						$pipe: [
							{ $get: "powers" },
							{
								$pipe: [
									{
										$filter: {
											$pipe: [{ $get: "yearIntroduced" }, { $lt: 1985 }],
										},
									},
									{ $pluck: "name" },
								],
							},
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
			expect(extent).toContain("powers.name");
		});

		it("handles $filterBy", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					filtered: {
						$pipe: [
							{ $get: "powers" },
							{ $filterBy: { yearIntroduced: { $gte: 1985 }, name: "Caring" } },
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
			expect(extent).toContain("powers.name");
		});

		it("handles $filterBy with nested expressions", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				select: {
					complexFilter: {
						$pipe: [
							{ $get: "powers" },
							{
								$filterBy: {
									yearIntroduced: { $gte: 1985 },
									wielders: { $pipe: [{ $get: "length" }, { $gt: 2 }] },
								},
							},
						],
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("powers");
			expect(extent).toContain("powers.yearIntroduced");
			expect(extent).toContain("powers.wielders");
			expect(extent).toContain("powers.wielders.length");
		});
	});

	describe("group mode", () => {
		it("includes attributes from group.by", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
		});

		it("includes attributes from group.by array", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: ["yearIntroduced", "bellyBadge"],
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("bellyBadge");
		});

		it("includes attributes from group.select", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: ["yearIntroduced", "bellyBadge"],
					select: ["yearIntroduced", "bellyBadge"],
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("bellyBadge");
		});

		it("includes attributes from group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						count: { $count: null },
						totalNames: { $pluck: "name" },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("name");
		});

		it("includes nested paths from group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						homeNames: { $pluck: "home.name" },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("home.name");
		});

		it("combines attributes from both group.select and group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					select: { year: "yearIntroduced" },
					aggregates: {
						nameCount: { $count: { $get: "name" } },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("name");
		});

		it("does not traverse into nested group clauses", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					select: ["yearIntroduced"],
					aggregates: {
						count: { $count: null },
					},
					group: {
						by: "count",
						select: ["count"],
						aggregates: {
							years: { $pluck: "yearIntroduced" },
							nestedNameCount: { $count: { $get: "count" } },
						},
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			// Should NOT include "name" from the nested group's aggregates
			expect(extent).not.toContain("count");
		});
	});
});

describe.only("getFullQueryExtent", () => {
	describe("simple attribute selection", () => {
		it("returns root attributes", () => {
			const query = {
				type: "bears",
				select: { name: "name", yearIntroduced: "yearIntroduced" },
			};
			const extent = getFullQueryExtent(careBearSchema, query);
			expect(extent).toEqual({
				attributes: ["name", "yearIntroduced"],
				relationships: {},
			});
		});

		it("handles star expansion", () => {
			const query = { type: "bears", select: "*" };
			const extent = getFullQueryExtent(careBearSchema, query);
			expect(extent).toEqual({
				attributes: Object.keys(careBearSchema.resources.bears.attributes),
				relationships: {},
			});
		});
	});

	describe("relationship selection", () => {
		it("returns relationship paths", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					home: { select: { name: "name" } },
				},
			});
			expect(extent).toEqual({
				attributes: ["name"],
				relationships: { home: { attributes: ["name"], relationships: {} } },
			});
		});

		it("handles nested relationships", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					home: {
						name: "name",
						residents: ["name"],
					},
				},
			});
			expect(extent).toEqual({
				attributes: ["name"],
				relationships: {
					home: {
						attributes: ["name"],
						relationships: {
							residents: { attributes: ["name"], relationships: {} },
						},
					},
				},
			});
		});
	});

	describe("$get expression", () => {
		it("extracts simple property paths", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					displayName: { $get: "name" },
				},
			});
			expect(extent).toEqual({ attributes: ["name"], relationships: {} });
		});

		it("extracts nested property paths", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					homeName: { $get: "home.name" },
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: { home: { attributes: ["name"], relationships: {} } },
			});
		});

		it("strips $ wildcard from paths", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					powerNames: { $get: "powers.$.name" },
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: { powers: { attributes: ["name"], relationships: {} } },
			});
		});
	});

	describe("$matchesAll expression", () => {
		it("extracts properties from match object", () => {
			const query = {
				type: "bears",
				select: {
					isMatch: {
						$matchesAll: {
							name: "Tenderheart Bear",
							yearIntroduced: 1983,
						},
					},
				},
			};
			const extent = getFullQueryExtent(careBearSchema, query);
			expect(extent).toEqual({
				attributes: ["name", "yearIntroduced"],
				relationships: {},
			});
		});
	});

	describe("$exists expression", () => {
		it("extracts property path", () => {
			const query = {
				type: "bears",
				select: {
					hasHome: { $exists: "home" },
				},
			};
			const extent = getFullQueryExtent(careBearSchema, query);
			expect(extent).toEqual({
				attributes: [],
				relationships: { home: { attributes: [], relationships: {} } },
			});
		});

		it("extracts nested property path", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					hasHomeName: { $exists: "home.name" },
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: { home: { attributes: ["name"], relationships: {} } },
			});
		});
	});

	describe("complex expressions", () => {
		it("handles $pipe with $get", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					upperName: {
						$pipe: [{ $get: "name" }, { $uppercase: null }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: ["name"],
				relationships: {},
			});
		});

		it("handles $pipe with $get and $matchesAll", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					livesInCaringPlace: {
						$pipe: [
							{ $get: "home" },
							{ $matchesAll: { caringMeter: { $gt: 50 }, isInClouds: true } },
						],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					home: {
						attributes: ["caringMeter", "isInClouds"],
						relationships: {},
					},
				},
			});
		});

		it("handles $pipe with $get, $matchesAll, with a second $get cherry on top", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					livesInFriendlyPlace: {
						$pipe: [
							{ $get: "home" },
							{
								$and: [
									{
										$matchesAll: {
											caringMeter: { $eq: { $count: { $get: "bears" } } },
											isInClouds: true,
										},
									},
									{ $gt: [{ $count: { $get: "residents" } }, 3] },
								],
							},
						],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					home: {
						attributes: ["caringMeter", "isInClouds"],
						relationships: {
							residents: { attributes: [], relationships: {} },
						},
					},
				},
			});
		});

		it("handles a $matchesAll -> $get -> $matchesAny pattern", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					caringEnough: {
						$matchesAll: {
							bellyBadge: { $not: "heart" },
							home: {
								$matchesAny: {
									caringMeter: { $gt: 0.5 },
									isInClouds: true,
								},
							},
						},
					},
				},
			});
			expect(extent).toEqual({
				attributes: ["bellyBadge"],
				relationships: {
					home: {
						attributes: ["caringMeter", "isInClouds"],
						relationships: {},
					},
				},
			});
		});

		it("handles $pluck", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					powerNames: {
						$pipe: [{ $get: "powers" }, { $pluck: "name" }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["name"],
						relationships: {},
					},
				},
			});
		});

		it("handles $sort with string property", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					sortedPowers: {
						$pipe: [{ $get: "powers" }, { $sort: { by: "name" } }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["name"],
						relationships: {},
					},
				},
			});
		});

		it("handles $sort with expression property", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					sortedPowers: {
						$pipe: [{ $get: "powers" }, { $sort: { by: { $get: "name" } } }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["name"],
						relationships: {},
					},
				},
			});
		});

		it("handles $sort with mixed string and expression properties", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					sortedPowers: {
						$pipe: [
							{ $get: "powers" },
							{ $sort: { by: [{ $get: "name" }, "type"] } },
						],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["name", "type"],
						relationships: {},
					},
				},
			});
		});

		it("handles $groupBy with string property", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					groupedByYear: {
						$pipe: [{ $get: "powers" }, { $groupBy: "type" }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["type"],
						relationships: {},
					},
				},
			});
		});

		it("handles $groupBy with expression property", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					groupedByYear: {
						$pipe: [{ $get: "powers" }, { $groupBy: { $get: "type" } }],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: {
						attributes: ["type"],
						relationships: {},
					},
				},
			});
		});
	});

	describe("deduplication", () => {
		it("removes duplicate paths", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					name: "name",
					upperName: { $uppercase: { $get: "name" } },
					lowerName: { $lowercase: { $get: "name" } },
				},
			});
			expect(extent).toEqual({
				attributes: ["name"],
				relationships: {},
			});
		});
	});

	describe("edge cases", () => {
		it("handles expressions that don't reference attributes or relationships", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					literalValue: { $literal: { foo: "bar" } },
					computed: { $add: [1, 2] },
				},
			});
			expect(extent).toEqual({ attributes: [], relationships: {} });
		});

		it("handles array paths in $get", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					homeName: { $get: ["home", "name"] },
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: { home: { attributes: ["name"], relationships: {} } },
			});
		});

		it("handles nested $pipe expressions", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					complex: {
						$pipe: [
							{ $get: "powers" },
							{
								$pipe: [
									{
										$filter: {
											$pipe: [{ $get: "type" }, { $lt: 1985 }],
										},
									},
									{ $pluck: "name" },
								],
							},
						],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: { attributes: ["type", "name"], relationships: {} },
				},
			});
		});

		it("handles $filterBy", () => {
			const extent = getFullQueryExtent(careBearSchema, {
				type: "bears",
				select: {
					filtered: {
						$pipe: [
							{ $get: "powers" },
							{ $filterBy: { type: { $eq: "bear" }, name: "Caring" } },
						],
					},
				},
			});
			expect(extent).toEqual({
				attributes: [],
				relationships: {
					powers: { attributes: ["type", "name"], relationships: {} },
				},
			});
		});
	});

	describe.skip("group mode", () => {
		it("includes attributes from group.by", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
		});

		it("includes attributes from group.by array", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: ["yearIntroduced", "bellyBadge"],
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("bellyBadge");
		});

		it("includes attributes from group.select", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: ["yearIntroduced", "bellyBadge"],
					select: ["yearIntroduced", "bellyBadge"],
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("bellyBadge");
		});

		it("includes attributes from group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						count: { $count: null },
						totalNames: { $pluck: "name" },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("name");
		});

		it("includes nested paths from group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						homeNames: { $pluck: "home.name" },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("home.name");
		});

		it("combines attributes from both group.select and group.aggregates", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					select: { year: "yearIntroduced" },
					aggregates: {
						nameCount: { $count: { $get: "name" } },
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			expect(extent).toContain("name");
		});

		it("does not traverse into nested group clauses", () => {
			const query = normalizeQuery(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					select: ["yearIntroduced"],
					aggregates: {
						count: { $count: null },
					},
					group: {
						by: "count",
						select: ["count"],
						aggregates: {
							years: { $pluck: "yearIntroduced" },
							nestedNameCount: { $count: { $get: "count" } },
						},
					},
				},
			});
			const extent = getQueryExtent(careBearSchema, query);
			expect(extent).toContain("yearIntroduced");
			// Should NOT include "name" from the nested group's aggregates
			expect(extent).not.toContain("count");
		});
	});
});
