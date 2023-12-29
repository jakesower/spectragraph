import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import { createQueryGraph } from "../../src/query-graph.js";

const graph = createQueryGraph(careBearData);

describe("limit/offset", () => {
	it("fetches a single resource", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			limit: 1,
		});

		expect(result).toEqual([{ name: "Tenderheart Bear" }]);
	});

	it("limits after sorting", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 2,
		});

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});

	it("limits after sorting with 1", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 1,
		});

		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("limits with an offset", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 2,
			offset: 1,
		});

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
		]);
	});

	it("allows for offset only", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			offset: 1,
		});

		expect(result).toEqual([
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("allows for limit + offset to exceed size of data", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 6,
			offset: 2,
		});

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("returns nothing when the offset has surpassed the data size", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 6,
			offset: 20,
		});

		expect(result).toEqual([]);
	});

	it("allows a zero offset", async () => {
		const result = await graph.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			offset: 0,
		});

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Smart Heart Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("errors for a bad limit", async () => {
		await expect(async () => {
			await graph.query({
				type: "bears",
				select: ["id"],
				limit: 0,
			});
		}).rejects.toThrowError();
	});

	it("errors for a bad offset", async () => {
		await expect(async () => {
			await graph.query({
				type: "bears",
				select: ["id"],
				limit: 3,
				offset: -1,
			});
		}).rejects.toThrowError();
	});
});
