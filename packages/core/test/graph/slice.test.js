import { expect, it, describe } from "vitest";
import { queryGraph } from "../../src/graph.js";
import { ensureValidQueryResult } from "../../src/resource.js";
import { careBearSchema, careBearData } from "../interface-tests/src/index.js";

describe("limit/offset", () => {
	it("fetches a single resource", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			slice: { limit: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ name: "Tenderheart Bear" }]);
		expect(() => {
			ensureValidQueryResult(careBearSchema, query, result);
		});
	});

	it("limits after sorting", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 2 },
		};

		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
		]);

		expect(() => {
			ensureValidQueryResult(careBearSchema, query, result);
		});
	});

	it("limits after sorting with 1", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("limits with an offset", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 2, offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("allows for offset only", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { offset: 1 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("allows for limit + offset to exceed size of data", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 6, offset: 2 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("returns nothing when the offset has surpassed the data size", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { limit: 6, offset: 20 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([]);
	});

	it("allows a zero offset", async () => {
		const query = {
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			slice: { offset: 0 },
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});
});
