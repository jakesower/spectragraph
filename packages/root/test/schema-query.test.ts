import { expect, it, describe } from "vitest";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import { forEachSchemaQuery, reduceSchemaQuery } from "../src/schema-query.js";
import { RootQuery, normalizeQuery } from "../src/query.js";

const query1: RootQuery = {
	type: "bears",
	select: [
		"id",
		"name",
		{
			home: {
				select: [
					"name",
					{
						residents: { select: ["bellyBadge"] },
						residentCount: { $count: "residents" },
					},
				],
				limit: 4,
			},
		},
	],
	limit: 3,
};

const normalQuery1 = normalizeQuery(query1);

describe("forEachSchemaQuery", () => {
	it("doesn't mutate the query", () => {
		const result = structuredClone(query1);
		forEachSchemaQuery(careBearSchema, query1, () => {});
		expect(result).toEqual(query1);
	});

	it("visits each subquery", () => {
		const visited = [] as any[];
		forEachSchemaQuery(careBearSchema, query1, (subquery) => {
			visited.push(subquery);
		});

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [] as any[];
		forEachSchemaQuery(careBearSchema, query1, (subquery, { path }) => {
			pathInfo.push(path);
		});

		expect(pathInfo).toEqual([[], ["home"], ["home", "residents"]]);
	});

	it("collects parent info", () => {
		const parents = [] as any[];
		forEachSchemaQuery(careBearSchema, query1, (subquery, { parent }) => {
			parents.push(parent);
		});

		expect(parents).toEqual([null, normalQuery1, normalQuery1.select.home]);
	});

	it("collects type info", () => {
		const types = [] as any[];
		forEachSchemaQuery(careBearSchema, query1, (subquery, { type }) => {
			types.push(type);
		});

		expect(types).toEqual(["bears", "homes", "bears"]);
	});
});

describe("reduceQuery", () => {
	it("reduces the query, collecting limits", () => {
		const result = reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery) => [...acc, subquery.limit],
			[] as (number | undefined)[],
		);

		expect(result).toEqual([3, 4, undefined]);
	});

	it("reduces the query, finding query attributes with their paths", () => {
		const result = reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery, { path }) => {
				const out = acc;
				Object.values(subquery.select).forEach((sq) => {
					if (typeof sq === "string") out.push([...path, sq].join("."));
				});

				return out;
			},
			[] as string[],
		);

		expect(result).toEqual([
			"id",
			"name",
			"home.name",
			"home.residents.bellyBadge",
		]);
	});

	it("visits each subquery", () => {
		const visited = [] as any[];
		reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery) => {
				visited.push(subquery);
				return null;
			},
			null,
		);

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [] as any[];
		reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery, { path }) => {
				pathInfo.push(path);
				return null;
			},
			null,
		);

		expect(pathInfo).toEqual([[], ["home"], ["home", "residents"]]);
	});

	it("collects parent info", () => {
		const parents = [] as any[];
		reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery, { parent }) => {
				parents.push(parent);
				return null;
			},
			null,
		);

		expect(parents).toEqual([null, normalQuery1, normalQuery1.select.home]);
	});

	it("collects type info", () => {
		const types = [] as any[];
		reduceSchemaQuery(
			careBearSchema,
			query1,
			(acc, subquery, { type }) => {
				types.push(type);
				return null;
			},
			null,
		);

		expect(types).toEqual(["bears", "homes", "bears"]);
	});
});
