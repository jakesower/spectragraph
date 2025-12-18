import { expect, it, describe } from "vitest";
import { careBearSchema } from "@spectragraph/interface-tests";
import { getQueryExtentByClause } from "../../src/query.js";

describe("getQueryExtentByClause", () => {
	describe("select", () => {
		describe("simple attribute selection", () => {
			it("returns root attributes", () => {
				const query = {
					type: "bears",
					select: { name: "name", yearIntroduced: "yearIntroduced" },
				};
				const extent = getQueryExtentByClause(careBearSchema, query);
				expect(extent.select).toEqual({
					attributes: ["name", "yearIntroduced"],
					relationships: {},
				});
			});

			it("handles star expansion", () => {
				const query = { type: "bears", select: "*" };
				const extent = getQueryExtentByClause(careBearSchema, query);
				expect(extent.select).toEqual({
					attributes: Object.keys(careBearSchema.resources.bears.attributes),
					relationships: {},
				});
			});
		});

		describe("relationship selection", () => {
			it("returns relationship paths", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						name: "name",
						home: { select: { name: "name" } },
					},
				});
				expect(extent.select).toEqual({
					attributes: ["name"],
					relationships: { home: { attributes: ["name"], relationships: {} } },
				});
			});

			it("handles nested relationships", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						name: "name",
						home: {
							name: "name",
							residents: ["name"],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						displayName: { $get: "name" },
					},
				});
				expect(extent.select).toEqual({
					attributes: ["name"],
					relationships: {},
				});
			});

			it("extracts nested property paths", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						homeName: { $get: "home.name" },
					},
				});
				expect(extent.select).toEqual({
					attributes: [],
					relationships: { home: { attributes: ["name"], relationships: {} } },
				});
			});

			it("strips $ wildcard from paths", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						powerNames: { $get: "powers.$.name" },
					},
				});
				expect(extent.select).toEqual({
					attributes: [],
					relationships: {
						powers: { attributes: ["name"], relationships: {} },
					},
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
				const extent = getQueryExtentByClause(careBearSchema, query);
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, query);
				expect(extent.select).toEqual({
					attributes: [],
					relationships: { home: { attributes: [], relationships: {} } },
				});
			});

			it("extracts nested property path", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						hasHomeName: { $exists: "home.name" },
					},
				});
				expect(extent.select).toEqual({
					attributes: [],
					relationships: { home: { attributes: ["name"], relationships: {} } },
				});
			});
		});

		describe("complex expressions", () => {
			it("handles $pipe with $get", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						upperName: {
							$pipe: [{ $get: "name" }, { $uppercase: null }],
						},
					},
				});
				expect(extent.select).toEqual({
					attributes: ["name"],
					relationships: {},
				});
			});

			it("handles $pipe with $get and $matchesAll", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						powerNames: {
							$pipe: [{ $get: "powers" }, { $pluck: "name" }],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						sortedPowers: {
							$pipe: [{ $get: "powers" }, { $sort: { by: "name" } }],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						sortedPowers: {
							$pipe: [{ $get: "powers" }, { $sort: { by: { $get: "name" } } }],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						groupedByYear: {
							$pipe: [{ $get: "powers" }, { $groupBy: "type" }],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						groupedByYear: {
							$pipe: [{ $get: "powers" }, { $groupBy: { $get: "type" } }],
						},
					},
				});
				expect(extent.select).toEqual({
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
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						name: "name",
						upperName: { $uppercase: { $get: "name" } },
						lowerName: { $lowercase: { $get: "name" } },
					},
				});
				expect(extent.select).toEqual({
					attributes: ["name"],
					relationships: {},
				});
			});
		});

		describe("edge cases", () => {
			it("handles expressions that don't reference attributes or relationships", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						literalValue: { $literal: { foo: "bar" } },
						computed: { $add: [1, 2] },
					},
				});
				expect(extent.select).toEqual({ attributes: [], relationships: {} });
			});

			it("handles array paths in $get", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
					type: "bears",
					select: {
						homeName: { $get: ["home", "name"] },
					},
				});
				expect(extent.select).toEqual({
					attributes: [],
					relationships: { home: { attributes: ["name"], relationships: {} } },
				});
			});

			it("handles nested $pipe expressions", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
					attributes: [],
					relationships: {
						powers: { attributes: ["type", "name"], relationships: {} },
					},
				});
			});

			it("handles $filterBy", () => {
				const extent = getQueryExtentByClause(careBearSchema, {
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
				expect(extent.select).toEqual({
					attributes: [],
					relationships: {
						powers: { attributes: ["type", "name"], relationships: {} },
					},
				});
			});
		});
	});

	describe("group", () => {
		it("includes attributes from group.by", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
				},
			});
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced"],
				relationships: {},
			});
		});

		it("includes attributes from group.by array", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				group: {
					by: ["yearIntroduced", "bellyBadge"],
				},
			});
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced", "bellyBadge"],
				relationships: {},
			});
		});

		it("includes attributes from group.aggregates", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						count: { $count: null },
						totalNames: { $pluck: "name" },
					},
				},
			});
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced", "name"],
				relationships: {},
			});
		});

		it("includes nested paths from group.aggregates", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					aggregates: {
						homeNames: { $pluck: "home.name" },
					},
				},
			});
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced"],
				relationships: { home: { attributes: ["name"], relationships: {} } },
			});
		});

		it("combines attributes from both group.by and group.aggregates", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				group: {
					by: "yearIntroduced",
					select: { year: "yearIntroduced" },
					aggregates: {
						nameCount: { $count: { $get: "name" } },
					},
				},
			});
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced", "name"],
				relationships: {},
			});
		});

		it("does not traverse into nested group clauses", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
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
			expect(extent.group).toEqual({
				attributes: ["yearIntroduced"],
				relationships: {},
			});
		});

		it("includes attributes from a nested group", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				select: {
					home: {
						group: { by: ["name"], aggregates: { total: { $count: null } } },
					},
				},
			});
			expect(extent.group).toEqual({
				attributes: [],
				relationships: {
					home: {
						attributes: ["name"],
						relationships: {},
					},
				},
			});
		});
	});

	describe("where", () => {
		it("includes attributes from simple equality conditions", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				select: "*",
				where: { name: "Tenderheart Bear", yearIntroduced: 1983 },
			});
			expect(extent.where).toEqual({
				attributes: ["name", "yearIntroduced"],
				relationships: {},
			});
		});

		it("includes attributes from comparison expressions ($gt, $lt, etc.)", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				select: "*",
				where: {
					yearIntroduced: { $gt: 1985 },
					name: { $ne: "Grumpy Bear" },
				},
			});
			expect(extent.where).toEqual({
				attributes: ["yearIntroduced", "name"],
				relationships: {},
			});
		});

		it("includes attributes from complex logical expressions ($and, $or, $not)", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				select: "*",
				where: {
					$and: [
						{ yearIntroduced: { $gt: 1985 } },
						{
							$or: [
								{ name: "Tenderheart Bear" },
								{ $not: { bellyBadge: "heart" } },
							],
						},
					],
				},
			});
			expect(extent.where).toEqual({
				attributes: ["yearIntroduced", "name", "bellyBadge"],
				relationships: {},
			});
		});

		it("includes attributes from $matchesAll within where clause", () => {
			const extent = getQueryExtentByClause(careBearSchema, {
				type: "bears",
				select: {
					home: {
						select: ["name"],
						where: {
							$matchesAll: {
								caringMeter: { $gt: 50 },
								isInClouds: true,
							},
						},
					},
				},
			});
			expect(extent.where).toEqual({
				attributes: [],
				relationships: {
					home: {
						attributes: ["caringMeter", "isInClouds"],
						relationships: {},
					},
				},
			});
		});
	});
});
