import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../get-client.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearData } from "../fixtures/care-bear-data.js";
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { reset } from "../../scripts/seed.js";

describe("Query Tests", () => {
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

	it("fetches a single resource", async () => {
		const result = await store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("fetches a single resource with its id", async () => {
		const result = await store.query({
			type: "bears",
			id: "1",
			select: {
				id: "id",
				name: "name",
			},
		});

		expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
	});

	it("fetches a single resource with a to-one relationship", async () => {
		const result = await store.query({
			type: "bears",
			id: "1",
			select: {
				name: "name",
				home: {
					select: { name: "name" },
				},
			},
		});

		expect(result).toEqual({
			name: "Tenderheart Bear",
			home: { name: "Care-a-Lot" },
		});
	});

	it("fetches a single resource with a many-to-many relationship", async () => {
		const result = await store.query({
			type: "bears",
			id: "1",
			select: {
				name: "name",
				powers: {
					select: { name: "name" },
				},
			},
		});

		expect(result).toEqual({
			name: "Tenderheart Bear",
			powers: [{ name: "Care Bear Stare" }],
		});
	});

	it("fetches a single resource with a to-many relationship", async () => {
		const result = await store.query({
			type: "homes",
			id: "1",
			select: {
				name: "name",
				residents: {
					select: { name: "name" },
				},
			},
		});

		expect(result).toEqual({
			name: "Care-a-Lot",
			residents: [{ name: "Tenderheart Bear" }],
		});
	});

	it("fetches multiple resources", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
		});

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
			{ name: "Smart Heart Bear" },
		]);
	});

	it("fetches multiple resources and orders by name", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
			order: { name: "desc" },
		});

		expect(result).toEqual([
			{ name: "Wish Bear" },
			{ name: "Tenderheart Bear" },
			{ name: "Smart Heart Bear" },
			{ name: "Cheer Bear" },
		]);
	});

	it("fetches multiple resources and limits to 2", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
			limit: 2,
		});

		expect(result).toEqual([
			{ name: "Tenderheart Bear" },
			{ name: "Cheer Bear" },
		]);
	});

	it("fetches multiple resources with offset", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
			offset: 1,
			limit: 2,
		});

		expect(result).toEqual([
			{ name: "Cheer Bear" },
			{ name: "Wish Bear" },
		]);
	});

	it("fetches resources by filtering on a simple constraint", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
			where: { name: "Cheer Bear" },
		});

		expect(result).toEqual([{ name: "Cheer Bear" }]);
	});

	it("fetches resources using a more complex where constraint", async () => {
		const result = await store.query({
			type: "bears",
			select: ["name"],
			where: { yearIntroduced: { $gte: 1983 } },
		});

		expect(result).toEqual([{ name: "Smart Heart Bear" }]);
	});

	it("fetches resources and their relationships with a where constraint", async () => {
		const result = await store.query({
			type: "powers",
			id: "careBearStare",
			select: {
				powerId: "powerId",
				wielders: {
					select: ["name"],
					where: { bellyBadge: "shooting star" },
				},
			},
		});

		expect(result).toEqual({
			powerId: "careBearStare",
			wielders: [{ name: "Wish Bear" }],
		});
	});
});