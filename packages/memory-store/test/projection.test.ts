import { beforeEach, expect, it, describe } from "vitest";
import { Store, createMemoryStore } from "../src/memory-store";
import {
	project,
	projectionQuery,
	projectionQueryProperties,
} from "../src/projection.js";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bears.schema";

type LocalTestContext = {
	store: Store<typeof careBearSchema>;
};

// Test Setup
beforeEach<LocalTestContext>((context) => {
	const store = createMemoryStore(careBearSchema);
	store.seed(careBearData);

	context.store = store;
});

it<LocalTestContext>("projects a field onto itself", async (context) => {
	const results = await context.store.get({
		type: "bears",
		properties: {
			name: {},
		},
	});

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

it<LocalTestContext>("projects a field to a different name", async (context) => {
	const results = await context.store.get({
		type: "bears",
		properties: {
			name: {},
		},
	});

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

it<LocalTestContext>("projects a field to a literal expression", async (context) => {
	const results = await context.store.get({
		type: "bears",
		properties: {
			name: {},
		},
	});

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

it<LocalTestContext>("applies expressions over a nested resource", async (context) => {
	const results = await context.store.get({
		type: "bears",
		properties: {
			name: {},
			powers: {},
		},
	});

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
	it<LocalTestContext>("projects over a nested resource", async (context) => {
		const results = await context.store.get({
			type: "bears",
			properties: {
				name: {},
				home: {
					properties: {
						name: "home",
					},
				},
			},
		});

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

	it<LocalTestContext>("applies expressions over a nested resource", async (context) => {
		const results = await context.store.get({
			type: "bears",
			properties: {
				name: {},
				powers: {},
			},
		});

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

	it<LocalTestContext>("applies expressions over an aggregated resource", async (context) => {
		const results = await context.store.get({
			type: "homes",
			properties: {
				name: {},
				residents: {
					properties: {
						powers: {},
					},
				},
			},
		});

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

	it<LocalTestContext>("applies expressions over a deeply nested aggregated resource", async (context) => {
		const results = await context.store.get({
			type: "homes",
			properties: {
				name: {},
				residents: {
					properties: {
						powers: {
							properties: {
								wielders: {},
							},
						},
					},
				},
			},
		});

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

		expect(qProps).toEqual({ name: true });
	});

	it("ignores renamed query props", () => {
		const projection = {
			nombre: "name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: true });
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

		expect(qProps).toEqual({ name: true, powers: true });
	});

	it("handles nested props", () => {
		const projection = {
			name: "name",
			homeName: "home.name",
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({ name: true, home: { properties: { name: true } } });
	});

	it("handles $ nesting", () => {
		const projection = {
			name: "name",
			residentPowerCount: { $count: "residents.$.powers" },
		};

		const qProps = projectionQueryProperties(projection);

		expect(qProps).toEqual({
			name: true,
			residents: { properties: { powers: true } },
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
			name: true,
			home: { properties: { name: true, neighborhood: { properties: { name: true } } } },
		});
	});
});
