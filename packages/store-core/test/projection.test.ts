import { expect, it, describe } from "vitest";
import { project, projectionQueryProperties } from "../src/projection.js";
import { careBearData } from "./fixtures/care-bear-data.js";

const deref = (type, id) => careBearData[type][id];

it("projects a field onto itself", async () => {
	const results = Object.values(careBearData.bears);

	const projection = {
		name: "name",
	};

	const projected = project(results, projection);

	expect(projected).toEqual([
		{ name: "Tenderheart Bear" },
		{ name: "Cheer Bear" },
		{ name: "Wish Bear" },
		{ name: "Smart Heart Bear" },
	]);
});

it("projects a field to a different name", async () => {
	const results = Object.values(careBearData.bears);

	const projection = {
		nombre: "name",
	};

	const projected = project(results, projection);

	expect(projected).toEqual([
		{ nombre: "Tenderheart Bear" },
		{ nombre: "Cheer Bear" },
		{ nombre: "Wish Bear" },
		{ nombre: "Smart Heart Bear" },
	]);
});

it("projects a field to a literal expression", async () => {
	const results = Object.values(careBearData.bears);

	const projection = {
		beep: { $literal: "boop" },
	};

	const projected = project(results, projection);

	expect(projected).toEqual([
		{ beep: "boop" },
		{ beep: "boop" },
		{ beep: "boop" },
		{ beep: "boop" },
	]);
});

it("projects a field to an expression", async () => {
	const results = Object.values(careBearData.homes);

	const projection = {
		name: "name",
		numberOfResidents: { $count: "residents" },
	};

	const projected = project(results, projection);

	expect(projected).toEqual([
		{ name: "Care-a-Lot", numberOfResidents: 3 },
		{ name: "Forest of Feelings", numberOfResidents: 0 },
		{ name: "Earth", numberOfResidents: 0 },
	]);
});

it("applies expressions over a nested resource", async () => {
	const results = Object.values(
		Object.values(careBearData.bears).map((bear) => ({
			...bear,
			powers: bear.powers.map((id) => deref("powers", id)),
		})),
	) as any;

	const projection = {
		name: "name",
		powerCount: { $count: { $get: "powers" } },
	};

	const projected = project(results, projection);

	expect(projected).toEqual([
		{ name: "Tenderheart Bear", powerCount: 1 },
		{ name: "Cheer Bear", powerCount: 1 },
		{ name: "Wish Bear", powerCount: 1 },
		{ name: "Smart Heart Bear", powerCount: 1 },
	]);
});

describe("dot notation", () => {
	it("projects over a nested resource", async () => {
		const results = Object.values(
			Object.values(careBearData.bears).map((bear) => ({
				...bear,
				home: deref("homes", bear.home),
			})),
		) as any;

		const projection = {
			name: "name",
			home: "home.name",
		};

		const projected = project(results, projection);

		expect(projected).toEqual([
			{ name: "Tenderheart Bear", home: "Care-a-Lot" },
			{ name: "Cheer Bear", home: "Care-a-Lot" },
			{ name: "Wish Bear", home: "Care-a-Lot" },
			{ name: "Smart Heart Bear", home: null },
		]);
	});

	it("applies expressions over a nested resource", async () => {
		const results = Object.values(
			Object.values(careBearData.bears).map((bear) => ({
				...bear,
				powers: bear.powers.map((id) => deref("powers", id)),
			})),
		) as any;

		const projection = {
			name: "name",
			powerCount: { $count: "powers" },
		};

		const projected = project(results, projection);

		expect(projected).toEqual([
			{ name: "Tenderheart Bear", powerCount: 1 },
			{ name: "Cheer Bear", powerCount: 1 },
			{ name: "Wish Bear", powerCount: 1 },
			{ name: "Smart Heart Bear", powerCount: 1 },
		]);
	});

	it("applies expressions over an aggregated resource", async () => {
		const results = Object.values(
			Object.values(careBearData.homes).map((home) => ({
				...home,
				powers: home.residents.map((id) => {
					const bear = deref("bears", id);
					return {
						...bear,
						powers: bear.powers.map((id) => deref("powers", id)),
					};
				}),
			})),
		) as any;

		const projection = {
			name: "name",
			residentPowerCount: { $count: "residents.$.powers" },
		};

		const projected = project(results, projection);

		expect(projected).toEqual([
			{ name: "Care-a-Lot", residentPowerCount: 3 },
			{ name: "Forest of Feelings", residentPowerCount: 0 },
			{ name: "Earth", residentPowerCount: 0 },
		]);
	});

	it("applies expressions over a deeply nested aggregated resource", async () => {
		const results = Object.values(
			Object.values(careBearData.homes).map((home) => ({
				...home,
				residents: home.residents.map((id) => {
					const bear = deref("bears", id);
					return {
						...bear,
						powers: bear.powers.map((id) => {
							const power = deref("powers", id);
							return {
								...power,
								wielders: power.wielders.map((id) => deref("bears", id)),
							};
						}),
					};
				}),
			})),
		) as any;

		const projection = {
			name: "name",
			wieldersCount: { $count: "residents.$.powers.$.wielders" },
		};

		const projected = project(results, projection);

		expect(projected).toEqual([
			{ name: "Care-a-Lot", wieldersCount: 12 },
			{ name: "Forest of Feelings", wieldersCount: 0 },
			{ name: "Earth", wieldersCount: 0 },
		]);
	});
});

describe("projectionQueryProperties", () => {
	it("creates reflective query props", () => {
		const projection = {
			name: "name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: "name" });
	});

	it("ignores renamed query props", () => {
		const projection = {
			nombre: "name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: "name" });
	});

	it("handles literals", () => {
		const projection = {
			beep: { $literal: "boop" },
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({});
	});

	it("handles refs", () => {
		const projection = {
			name: "name",
			powerCount: { $count: "powers" },
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: "name", powers: "powers" });
	});

	it("handles nested props", () => {
		const projection = {
			name: "name",
			homeName: "home.name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: "name", home: { properties: { name: "name" } } });
	});

	it("handles $ nesting", () => {
		const projection = {
			name: "name",
			residentPowerCount: { $count: "residents.$.powers" },
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({
			name: "name",
			residents: { properties: { powers: "powers" } },
		});
	});

	it("multiple levels of nesting", () => {
		const projection = {
			name: "name",
			homeName: "home.name",
			neighborhoodName: "home.neighborhood.name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({
			name: "name",
			home: {
				properties: { name: "name", neighborhood: { properties: { name: "name" } } },
			},
		});
	});
});
