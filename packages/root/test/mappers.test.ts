import { expect, it, describe } from "vitest";
import { careBearData } from "./fixtures/care-bear-data.js";
import { careBearSchema } from "./fixtures/care-bear-schema.js";
import {
	normalizeResource,
	normalizeResources,
	flattenResource,
} from "../src/mappers.js";
import { flatCareBearData } from "./fixtures/care-bear-data-flat.js";
import { omit, pick } from "lodash-es";

describe("flattenResource", () => {
	it("flattens a resource", () => {
		const flat = flattenResource("1", careBearData.bears[1]);

		expect(flat).toEqual({
			id: "1",
			name: "Tenderheart Bear",
			yearIntroduced: 1982,
			bellyBadge: "red heart with pink outline",
			furColor: "tan",
			bestFriend: null,
			home: "1",
			powers: ["careBearStare"],
		});
	});

	it("flattens a resource with a different id field", () => {
		const flat = flattenResource(
			"careBearStare",
			careBearData.powers.careBearStare,
			"powerId",
		);

		expect(flat).toEqual({
			powerId: "careBearStare",
			name: "Care Bear Stare",
			description: "Purges evil.",
			type: "group power",
			wielders: ["1", "2", "3"],
		});
	});
});

describe("normalizeResource", () => {
	it("formats a flat resource", () => {
		const resource = normalizeResource(
			"bears",
			flatCareBearData.bears[0],
			careBearSchema,
		);

		expect(resource).toEqual(careBearData.bears[1]);
	});

	it("formats a resource with attributes only", () => {
		const base = omit(flatCareBearData.bears[0], [
			"bestFriend",
			"powers",
			"home",
		]);

		const resource = normalizeResource("bears", base, careBearSchema);

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				home: null,
				bestFriend: null,
				powers: [],
			},
		});
	});

	it("formats with a renaming", () => {
		const base = {
			...flatCareBearData.bears[0],
			nombre: "Tiernosito",
			name: undefined,
		};

		const resource = normalizeResource("bears", base, careBearSchema, {
			name: "nombre",
		});

		expect(resource).toEqual({
			...careBearData.bears[1],
			attributes: { ...careBearData.bears[1].attributes, name: "Tiernosito" },
		});
	});

	it("formats with a function", () => {
		const base = {
			...flatCareBearData.bears[0],
			nombre: "Tiernosito",
		};

		const resource = normalizeResource("bears", base, careBearSchema, {
			name: (res) => `${res.name} a.k.a. ${res.nombre}`,
		});

		expect(resource).toEqual({
			...careBearData.bears[1],
			attributes: {
				...careBearData.bears[1].attributes,
				name: "Tenderheart Bear a.k.a. Tiernosito",
			},
		});
	});

	it("formats relationship objects", () => {
		const base = {
			...flatCareBearData.bears[0],
			home: flatCareBearData.homes[0],
		};

		const resource = normalizeResource("bears", base, careBearSchema);

		expect(resource).toEqual(careBearData.bears[1]);
	});
});

describe("normalizeResources", () => {
	it("makes a graph from a single resource", () => {
		const resource = flatCareBearData.bears[0];

		const graph = normalizeResources("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: {},
		});
	});

	it("makes a graph from multiple resources", () => {
		const resources = flatCareBearData.bears;

		const graph = normalizeResources("bears", resources, careBearSchema);

		expect(graph).toEqual({
			bears: careBearData.bears,
			powers: {},
			homes: {},
		});
	});

	it("maps a field on a resource", () => {
		const resource = {
			...flatCareBearData.bears[0],
			yearIntroduced: undefined,
			año: 1982,
		};

		const mappers = { bears: { yearIntroduced: "año" } };

		const graph = normalizeResources(
			"bears",
			[resource],
			careBearSchema,
			mappers,
		);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: {},
		});
	});

	it("walks a singly nested to-one resource", () => {
		const resource = {
			...flatCareBearData.bears[0],
			home: {
				...flatCareBearData.homes[0],
			},
		};

		const graph = normalizeResources("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: pick(careBearData.homes, ["1"]),
		});
	});

	it("walks a singly nested to-many resource", () => {
		const resource = {
			...flatCareBearData.bears[2],
			powers: flatCareBearData.powers,
		};

		const graph = normalizeResources("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["3"]),
			powers: careBearData.powers,
			homes: {},
		});
	});

  it("walks deeply nested resources", () => {

  })
});
