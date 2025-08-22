import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../get-client.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { reset } from "../../scripts/seed.js";
import { careBearData } from "../fixtures/care-bear-data.js";

describe("Limit/Offset Operations", () => {
	let store;
	let db;

	beforeEach(async () => {
		db = getClient();
		await reset(db, careBearSchema, careBearConfig, careBearData);
		
		store = createPostgresStore(careBearSchema, {
			...careBearConfig,
			db,
		});
	});

describe("limit/offset", () => {
	it("fetches a single resource", async () => {
		const result = await store.query({
			type: "bears",
			select: { name: "name" },
			limit: 1,
		});

		expect(result).toEqual([{ name: "Tenderheart Bear" }]);
	});

	it("limits after sorting", async () => {
		const result = await store.query({
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
		const result = await store.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 1,
		});

		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("limits with an offset", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
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
		const result = await store.query({
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
		const result = await store.query({
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

	it("allows for limit + offset when a to-one join is present", async () => {
		const result = await store.query({
			type: "bears",
			select: { name: "name", home: { select: ["name"] } },
			order: { name: "asc" },
			limit: 2,
			offset: 1,
		});

		expect(result).toEqual([
			{ name: "Smart Heart Bear", home: null },
			{ name: "Tenderheart Bear", home: { name: "Care-a-Lot" } },
		]);
	});

	it("allows for limit + offset when a to-many join is present", async () => {
		const result = await store.query({
			type: "homes",
			select: { name: "name", residents: { select: ["name"] } },
			order: { name: "asc" },
			limit: 2,
		});

		expect(result).toEqual([
			{
				name: "Care-a-Lot",
				residents: [
					{ name: "Tenderheart Bear" },
					{ name: "Cheer Bear" },
					{ name: "Wish Bear" },
				],
			},
			{ name: "Earth", residents: [] },
		]);
	});

	it("returns nothing when the offset has surpassed the data size", async () => {
		const result = await store.query({
			type: "bears",
			select: { name: "name" },
			order: { name: "asc" },
			limit: 6,
			offset: 20,
		});

		expect(result).toEqual([]);
	});

	it("allows a zero offset", async () => {
		const result = await store.query({
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
			await store.query({
				type: "bears",
				select: ["id"],
				limit: -1,
			});
		}).rejects.toThrowError();
	});

	it("errors for a bad offset", async () => {
		await expect(async () => {
			await store.query({
				type: "bears",
				select: ["id"],
				limit: 3,
				offset: -1,
			});
		}).rejects.toThrowError();
	});
});

});