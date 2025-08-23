import { expect, it, describe } from "vitest";
import { careBearData, careBearSchema } from "./fixtures/index.js";

export function runQueryTests(createStore) {
	describe("Query Operations", () => {
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

		it("can initialize with initial data", async () => {
			const store = createStore(careBearSchema, {
				initialData: { bears: careBearData.bears },
			});

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
}