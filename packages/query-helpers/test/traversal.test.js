import { expect, it, describe } from "vitest";
import {
	flattenQuery,
	forEachQuery,
	flatMapQuery,
	someQuery,
} from "../src/traversal.js";
import skepticismSchema from "./fixtures/skepticism.schema.json";

describe("flattenQuery", () => {
	it("flattens a simple query", () => {
		const query = {
			type: "skeptics",
			select: ["name", "specialty"],
		};

		const flattened = flattenQuery(skepticismSchema, query);

		expect(flattened).toEqual([
			{
				path: [],
				attributes: ["name", "specialty"],
				relationships: {},
				type: "skeptics",
				query,
				parent: null,
				parentQuery: null,
				parentRelationship: null,
			},
		]);
	});

	it("flattens a query with relationships", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: ["title", "conclusion"],
				},
			},
		};

		const flattened = flattenQuery(skepticismSchema, query);

		expect(flattened).toHaveLength(2);
		expect(flattened[0]).toMatchObject({
			path: [],
			attributes: ["name"],
			type: "skeptics",
			parentQuery: null,
		});
		expect(flattened[1]).toMatchObject({
			path: ["investigations"],
			attributes: ["title", "conclusion"],
			type: "investigations",
			parentRelationship: "investigations",
		});
	});

	it("handles nested relationships", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: {
						title: "title",
						subject: {
							type: "weirdBeliefs",
							select: ["name", "debunked"],
						},
					},
				},
			},
		};

		const flattened = flattenQuery(skepticismSchema, query);

		expect(flattened).toHaveLength(3);
		expect(flattened[2]).toMatchObject({
			path: ["investigations", "subject"],
			attributes: ["name", "debunked"],
			type: "weirdBeliefs",
			parentRelationship: "subject",
		});
	});
});

describe("forEachQuery", () => {
	it("iterates over all queries in the tree", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: ["title"],
				},
			},
		};

		const types = [];
		forEachQuery(skepticismSchema, query, (subquery, info) => {
			types.push(info.type);
		});

		expect(types).toEqual(["skeptics", "investigations"]);
	});
});

describe("flatMapQuery", () => {
	it("maps over queries and flattens results", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: ["title"],
				},
			},
		};

		const attributes = flatMapQuery(
			skepticismSchema,
			query,
			(subquery, info) => info.attributes,
		);

		expect(attributes).toEqual(["name", "title"]);
	});
});

describe("someQuery", () => {
	it("tests if any query matches condition", () => {
		const query = {
			type: "skeptics",
			select: {
				name: "name",
				investigations: {
					type: "investigations",
					select: ["title"],
				},
			},
		};

		const hasInvestigations = someQuery(
			skepticismSchema,
			query,
			(subquery, info) => info.type === "investigations",
		);

		expect(hasInvestigations).toBe(true);

		const hasBeliefs = someQuery(
			skepticismSchema,
			query,
			(subquery, info) => info.type === "weirdBeliefs",
		);

		expect(hasBeliefs).toBe(false);
	});
});
