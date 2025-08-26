import { expect, it, describe } from "vitest";
import { careBearData, careBearSchema } from "./fixtures/index.js";

export function runQueryTests(createStore) {
	describe("core query operations", () => {
		it("fetches appropriately on an empty store", async () => {
			const store = createStore(careBearSchema);
			const result = await store.query({
				type: "companions",
				id: "nonexistent",
				select: ["name"],
			});

			expect(result).toEqual(null);
		});

		it("fetches appropriately on an empty store with multiple resources", async () => {
			const store = createStore(careBearSchema);
			const result = await store.query({
				type: "villains",
				select: ["name"],
			});

			expect(result).toEqual([]);
		});

		it("fetches a single resource", async () => {
			const store = createStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = await store.query({
				type: "bears",
				id: "1",
				select: ["name"],
			});

			expect(result).toEqual({ name: "Tenderheart Bear" });
		});

		it("fetches a single resource with specific attributes", async () => {
			const store = createStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = await store.query({
				type: "bears",
				id: "1",
				select: ["id", "name", "yearIntroduced", "bellyBadge", "furColor"],
			});

			expect(result).toEqual({
				id: "1",
				name: "Tenderheart Bear",
				yearIntroduced: 1982,
				bellyBadge: "red heart with pink outline",
				furColor: "tan",
			});
		});
	});

	describe("select clauses", () => {
		describe("* notation", () => {
			it("fetches a single resource with * as a string", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: "*",
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});

			it("fetches a single resource with * in an array", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: ["name", "*"],
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});

			it("fetches a single resource with * in an object", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					id: "1",
					select: { "*": true },
				});

				expect(result).toEqual({
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
				});
			});
		});
	});

	describe("where clauses", () => {
		describe("general", () => {
			it("filters on a property equality constraint", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id", "name"],
					where: { name: "Cheer Bear" },
				});

				expect(result).toEqual([{ id: "2", name: "Cheer Bear" }]);
			});

			it("filters on an attribute that is not returned from selected attributes", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: ["id"],
					where: { name: { $eq: "Cheer Bear" } },
				});

				expect(result).toEqual([{ id: "2" }]);
			});

			it("filters on multiple property equality where", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
		});

		describe("expressions", () => {
			it("filters using $eq operator", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "powers",
					id: "careBearStare",
					select: {
						powerId: "powerId",
						wielders: {
							select: ["id", "bellyBadge"],
							where: {
								bellyBadge: { $eq: "shooting star" },
							},
						},
					},
				});

				expect(result).toEqual({
					powerId: "careBearStare",
					wielders: [{ id: "3", bellyBadge: "shooting star" }],
				});
			});

			it("filters using an $or operation", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

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
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: {
						id: "id",
					},
					where: {
						$or: [
							{ yearIntroduced: { $gt: 2000 } },
							{
								$and: [{ name: "Tenderheart Bear" }, { bellyBadge: "rainbow" }],
							},
						],
					},
				});

				expect(result).toEqual([{ id: "5" }]);
			});

			it("filters using an $or and $not operation", async () => {
				const store = createStore(careBearSchema, {
					initialData: careBearData,
				});

				const result = await store.query({
					type: "bears",
					select: {
						id: "id",
					},
					where: {
						$not: {
							$or: [
								{ yearIntroduced: { $gt: 2000 } },
								{ bellyBadge: "rainbow" },
							],
						},
					},
				});

				expect(result).toEqual([{ id: "1" }, { id: "3" }]);
			});
		});
	});
}
