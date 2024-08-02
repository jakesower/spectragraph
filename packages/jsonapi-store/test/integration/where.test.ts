import { describe, expect, it } from "vitest";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { createJSONAPIStore } from "../../src/jsonapi-store.js";
import { makeRequest } from "../helpers.js";

const store = createJSONAPIStore(careBearSchema, {
	baseURL: "http://127.0.0.1",
	transport: { get: makeRequest },
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

	it("filters using $eq operator", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id", "yearIntroduced"],
			where: {
				yearIntroduced: { $eq: 2005 },
			},
		});

		expect(result).toEqual([{ id: "5", yearIntroduced: 2005 }]);
	});

	it("filters using $eq operator without selecting the filtering attribute", async () => {
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

	it.only("filters using $in part 1", async () => {
		const result = await store.query({
			type: "bears",
			select: ["id"],
			where: {
				yearIntroduced: { $in: [2005, 2022] },
			},
		});

		expect(result).toEqual([{ id: "5" }]);
	});

	it("filters using $in part 2", async () => {
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

	describe.skip("where expressions", () => {
		it("filters using an $or operation", async () => {
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

		it("filters using an $or and $and operation", async () => {
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

		it("filters using an $or and $not operation", async () => {
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
