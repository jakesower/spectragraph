/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect, it, describe } from "vitest";
import { omit } from "lodash-es";
import {
	RootSchemalessQuery,
	forEachSchemalessQuery,
	mapSchemalessQuery,
	normalizeSchemalessQuery,
	reduceSchemalessQuery,
} from "../src/schemaless-query.js";

const query1: RootSchemalessQuery = {
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

const normalQuery1 = normalizeSchemalessQuery(query1);

describe("forEachSchemalessQuery", () => {
	it("doesn't mutate the query", () => {
		const result = structuredClone(query1);
		forEachSchemalessQuery(query1, () => {}); // eslint-disable-line
		expect(result).toEqual(query1);
	});

	it("visits each subquery", () => {
		const visited = [] as any[];
		forEachSchemalessQuery(query1, (subquery) => {
			visited.push(subquery);
		});

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [] as any[];
		forEachSchemalessQuery(query1, (subquery, { path }) => {
			pathInfo.push(path);
		});

		expect(pathInfo).toEqual([[], ["home"], ["home", "residents"]]);
	});

	it("collects parent info", () => {
		const parents = [] as any[];
		forEachSchemalessQuery(query1, (subquery, { parent }) => {
			parents.push(parent);
		});

		expect(parents).toEqual([null, normalQuery1, normalQuery1.select.home]);
	});
});

describe("mapSchemalessQuery", () => {
	it("maps the query, stripping out limits", () => {
		const result = mapSchemalessQuery(query1, (subquery) =>
			omit(subquery, ["limit"]),
		);

		expect(result).toEqual({
			type: "bears",
			select: {
				id: "id",
				name: "name",
				home: {
					select: {
						name: "name",
						residents: { select: { bellyBadge: "bellyBadge" } },
						residentCount: { $count: "residents" },
					},
				},
			},
		});
	});

	it("maps the query, interfering with child queries", () => {
		const result = mapSchemalessQuery(query1, (subquery, { parent }) =>
			parent ? "chicken" : subquery,
		);

		expect(result).toEqual({
			type: "bears",
			select: {
				id: "id",
				name: "name",
				home: "chicken",
			},
			limit: 3,
		});
	});

	it("visits each subquery", () => {
		const visited = [] as any[];
		mapSchemalessQuery(query1, (subquery) => {
			visited.push(subquery);
		});

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [] as any[];
		mapSchemalessQuery(query1, (subquery, { path }) => {
			pathInfo.push(path);
		});

		expect(pathInfo).toEqual([["home", "residents"], ["home"], []]);
	});

	it("collects parent info", () => {
		const parents = [] as any[];
		mapSchemalessQuery(query1, (subquery, { parent }) => {
			parents.push(parent);
		});

		expect(parents).toEqual([normalQuery1.select.home, normalQuery1, null]);
	});
});

describe("reduceSchemalessQuery", () => {
	it("reduces the query, collecting limits", () => {
		const result = reduceSchemalessQuery(
			query1,
			(acc, subquery) => [...acc, subquery.limit],
			[],
		);

		expect(result).toEqual([3, 4, undefined]);
	});

	it("reduces the query, finding query attributes with their paths", () => {
		const result = reduceSchemalessQuery(
			query1,
			(acc, subquery, { path }) => {
				const out = acc;
				Object.values(subquery.select).forEach((sq) => {
					if (typeof sq === "string") out.push([...path, sq].join("."));
				});

				return out;
			},
			[],
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
		reduceSchemalessQuery(
			query1,
			(subquery) => {
				visited.push(subquery);
			},
			[],
		);

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [] as any[];
		reduceSchemalessQuery(
			query1,
			(acc, subquery, { path }) => {
				pathInfo.push(path);
			},
			[],
		);

		expect(pathInfo).toEqual([[], ["home"], ["home", "residents"]]);
	});

	it("collects parent info", () => {
		const parents = [] as any[];
		reduceSchemalessQuery(
			query1,
			(acc, subquery, { parent }) => {
				parents.push(parent);
			},
			[],
		);

		expect(parents).toEqual([null, normalQuery1, normalQuery1.select.home]);
	});
});
