import { expect, it, describe } from "vitest";
import { queryGraph } from "../../src/graph.js";
import { careBearSchema, careBearData } from "../interface-tests/src/index.js";

describe("select expressions", () => {
	it("projects a field to a literal expression", async () => {
		const query = {
			type: "bears",
			select: {
				beep: { $literal: "boop" },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ beep: "boop" },
			{ beep: "boop" },
			{ beep: "boop" },
			{ beep: "boop" },
		]);
	});

	it("projects a field to an expression", async () => {
		const query = {
			type: "homes",
			select: {
				name: "name",
				numberOfResidents: { $pipe: [{ $get: "residents" }, { $count: null }] },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Care-a-Lot", numberOfResidents: 3 },
			{ name: "Forest of Feelings", numberOfResidents: 0 },
			{ name: "Earth", numberOfResidents: 0 },
		]);
	});

	it("applies expressions over a nested resource", async () => {
		const query = {
			type: "bears",
			select: {
				name: "name",
				powerCount: { $count: { $get: "powers" } },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Tenderheart Bear", powerCount: 1 },
			{ name: "Cheer Bear", powerCount: 1 },
			{ name: "Wish Bear", powerCount: 2 },
			{ name: "Smart Heart Bear", powerCount: 0 },
		]);
	});

	it("evaluates the minimum across one-to-many nested resources", async () => {
		const query = {
			type: "homes",
			select: {
				name: "name",
				minYear: { $min: { $get: "residents.$.yearIntroduced" } },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Care-a-Lot", minYear: 1982 },
			{ name: "Forest of Feelings", minYear: null },
			{ name: "Earth", minYear: null },
		]);
	});

	it("evaluates the minimum across many-to-many nested resources", async () => {
		const query = {
			type: "powers",
			select: {
				name: "name",
				minYear: { $min: { $get: "wielders.$.yearIntroduced" } },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Care Bear Stare", minYear: 1982 },
			{ name: "Make a Wish", minYear: 1982 },
			{ name: "Transform", minYear: null },
		]);
	});

	it("evaluates deeply nested values", async () => {
		const query = {
			type: "powers",
			select: {
				name: "name",
				caring: { $sum: { $get: "wielders.$.home.caringMeter" } },
			},
		};
		const result = queryGraph(careBearSchema, query, careBearData);

		expect(result).toEqual([
			{ name: "Care Bear Stare", caring: 3 },
			{ name: "Make a Wish", caring: 1 },
			{ name: "Transform", caring: 0 },
		]);
	});
});
