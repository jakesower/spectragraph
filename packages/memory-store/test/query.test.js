import { expect, it, describe } from "vitest";
import { omit } from "lodash-es";
import {
	forEachQuery,
	mapQuery,
	normalizeQuery,
	reduceQuery,
} from "../src/query.js";
import rawCareBearSchema from "./fixtures/care-bears.schema.json";

const careBearSchema = rawCareBearSchema;

const query1 = {
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

const normalQuery1 = normalizeQuery(careBearSchema, query1);

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

describe("forEachQuery", () => {
	it("doesn't mutate the query", () => {
		const result = structuredClone(query1);
		forEachQuery(careBearSchema, query1, () => {});
		expect(result).toEqual(query1);
	});

	it("visits each subquery", () => {
		const visited = [];
		forEachQuery(careBearSchema, query1, (subquery) => {
			visited.push(subquery);
		});

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [];
		forEachQuery(careBearSchema, query1, (subquery, { path }) => {
			pathInfo.push(path);
		});

		expect(pathInfo).toEqual([[], ["home"], ["home", "residents"]]);
	});

	it("collects parent info", () => {
		const parents = [];
		forEachQuery(careBearSchema, query1, (subquery, { parent }) => {
			parents.push(parent);
		});

		expect(parents).toEqual([null, normalQuery1, normalQuery1.select.home]);
	});

	it("collects type info", () => {
		const types = [];
		forEachQuery(careBearSchema, query1, (subquery, { type }) => {
			types.push(type);
		});

		expect(types).toEqual(["bears", "homes", "bears"]);
	});
});

describe("mapQuery", () => {
	it("maps the query, stripping out limits", () => {
		const result = mapQuery(careBearSchema, query1, (subquery) =>
			omit(subquery, ["limit"]),
		);

		expect(result).toEqual({
			type: "bears",
			select: {
				id: "id",
				name: "name",
				home: {
					type: "homes",
					select: {
						name: "name",
						residents: { type: "bears", select: { bellyBadge: "bellyBadge" } },
						residentCount: { $count: "residents" },
					},
				},
			},
		});
	});

	it("maps the query, interfering with child queries", () => {
		const result = mapQuery(careBearSchema, query1, (subquery, { parent }) =>
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
		const visited = [];
		mapQuery(careBearSchema, query1, (subquery) => {
			visited.push(subquery);
		});

		expect(visited.length).toEqual(3);
	});

	it("collects path info", () => {
		const pathInfo = [];
		mapQuery(careBearSchema, query1, (subquery, { path }) => {
			pathInfo.push(path);
		});

		expect(pathInfo).toEqual([["home", "residents"], ["home"], []]);
	});

	it("collects parent info", () => {
		const parents = [];
		mapQuery(careBearSchema, query1, (subquery, { parent }) => {
			parents.push(parent);
		});

		expect(parents).toEqual([normalQuery1.select.home, normalQuery1, null]);
	});

	it("collects type info", () => {
		const types = [];
		mapQuery(careBearSchema, query1, (subquery, { type }) => {
			types.push(type);
		});

		expect(types).toEqual(["bears", "homes", "bears"]);
	});
});

describe("reduceQuery", () => {
	it("reduces the query, collecting limits", () => {
		const result = reduceQuery(
			careBearSchema,
			query1,
			(acc, subquery) => [...acc, subquery.limit],
			[],
		);

		expect(result).toEqual([3, 4, undefined]);
	});

	it("reduces the query, finding query attributes with their paths", () => {
		const result = reduceQuery(
			careBearSchema,
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
		const visited = [];
		reduceQuery(
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
		const pathInfo = [];
		reduceQuery(
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
		const parents = [];
		reduceQuery(
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
		const types = [];
		reduceQuery(
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
