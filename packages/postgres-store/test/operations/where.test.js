import { describe, expect, it, beforeEach } from "vitest";
import { getClient } from "../get-client.js";
import { createPostgresStore } from "../../src/postgres-store.js";
import careBearSchema from "../fixtures/care-bears.schema.json" with { type: "json" };
import { careBearConfig } from "../fixtures/care-bear-config.js";
import { careBearData } from "../fixtures/care-bear-data.js";
import { reset } from "../../scripts/seed.js";

describe("Where Operations", () => {
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

	describe("where clauses", () => {
	it("filters on a property equality constraint", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id", "name"],
			where: { name: "Cheer Bear" },
		});

		expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
	});

	it("filters on a property that is not returned from properties", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: { name: { $eq: "Cheer Bear" } },
		});

		expect(result).toEqual([{ id: "2" }]);
	});

	it("filters on multiple property equality where", async () => {
		const result = await store.query({
			type: "homes",
			select: ["id"],
			where: {
				caringMeter: 1,
				isInClouds: false,
			},
		});

		expect(result).toEqual([{ id: "2" }]);
	});

	it.todo("filters on a to-one relationship");

	it("filters using $eq operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $eq: 2005 },
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $gt operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $gt: 2000 },
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $lt operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $lt: 2000 },
			},
		});

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters using $lte operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $lte: 2000 },
			},
		});

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters using $gte operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $gte: 2005 },
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $in 1", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $in: [2005, 2022] },
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $in 2", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $in: [2022] },
			},
		});

		expect(result).toEqual([]);
	});

	it("filters using $ne operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $ne: 2005 },
			},
		});

		expect(result).toEqual([{ id: "1" }, { id: "2" }, { id: "3" }]);
	});

	it("filters related resources", async () => {
		const result = await store.query({
			type: "powers",
			id: "careBearStare",
			select: {
				powerId: "powerId",
				wielders: {
					select: ["id"],
					where: {
						bellyBadge: { $eq: "shooting star" },
					},
				},
			},
		});

		expect(result).toEqual({
			powerId: "careBearStare",
			wielders: [{ id: "3" }],
		});
	});

	describe("where expressions", () => {
		it.skip("filters using an $or operation", async () => {
			const result = await store.query({
				type: "bears",
				select: {
					id: "id",
				},
				where: {
					$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
				},
			});

			expect(result).toEqual([{ id: "2" }, { id: "5" }]);
		});

		it.skip("filters using an $or and $and operation", async () => {
			const result = await store.query({
				type: "bears",
				select: {
					id: "id",
				},
				where: {
					$or: [
						{ yearIntroduced: { $gt: 2000 } },
						{ $and: [{ name: "Tenderheart Bear" }, { bellyBadge: "rainbow" }] },
					],
				},
			});

			expect(result).toEqual([{ id: "5" }]);
		});

		it.skip("filters using an $or and $not operation", async () => {
			const result = await store.query({
				type: "bears",
				select: {
					id: "id",
				},
				where: {
					$not: {
						$or: [{ yearIntroduced: { $gt: 2000 } }, { bellyBadge: "rainbow" }],
					},
				},
			});

			expect(result).toEqual([{ id: "1" }, { id: "3" }]);
		});
	});
	});
});