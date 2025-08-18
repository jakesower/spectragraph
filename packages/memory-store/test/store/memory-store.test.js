import { expect, it, describe } from "vitest";
import { careBearData, careBearSchema } from "@data-prism/test-fixtures";
import { createMemoryStore } from "../../src/memory-store.js";

describe("queryTree core", () => {
	it("fetches appropriately on an empty store", async () => {
		const store = createMemoryStore(careBearSchema);
		const result = store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual(null);
	});

	it("fetches appropriately on an empty store with multiple resources", async () => {
		const store = createMemoryStore(careBearSchema);
		const result = store.query({
			type: "bears",
			select: ["name"],
		});

		expect(result).toEqual([]);
	});

	it("fetches a single resource", async () => {
		const store = createMemoryStore(careBearSchema, {
			initialData: careBearData,
		});

		const result = store.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	describe("* notation", () => {
		it("fetches a single resource with * as a string", async () => {
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
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
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
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
			const store = createMemoryStore(careBearSchema, {
				initialData: careBearData,
			});

			const result = store.query({
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

	it("can initialize with initial data", async () => {
		const store = createMemoryStore(careBearSchema, {
			initialData: { bears: careBearData.bears },
		});

		const result = store.query({
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

});
