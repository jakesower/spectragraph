import { expect, it, describe } from "vitest";
import { careBearData } from "./fixtures/care-bear-data.js";
import rawCareBearSchema from "./fixtures/care-bears.schema.json";
import {
	normalizeResource,
	createGraphFromTrees,
	flattenResource,
} from "../src/mappers.js";
import { flatCareBearData } from "./fixtures/care-bear-data-flat.js";
import { omit, pick } from "lodash-es";

const careBearSchema = rawCareBearSchema;

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
			relationships: {},
		});
	});

	it("formats a nested resource", () => {
		const base = omit(flatCareBearData.bears[0], ["powers", "bestFriend"]);
		const withNested = { ...base, home: flatCareBearData.homes[0] };

		const resource = normalizeResource("bears", withNested, careBearSchema);

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				home: { type: "homes", id: "1" },
			},
		});
	});

	it("formats a nested resource with a nonstandard ID", () => {
		const base = omit(flatCareBearData.bears[0], ["home", "bestFriend"]);
		const withNested = { ...base, powers: [flatCareBearData.powers[0]] };

		const resource = normalizeResource("bears", withNested, careBearSchema);

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				powers: [{ type: "powers", id: "careBearStare" }],
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
			bears: {
				name: "nombre",
			},
		});

		expect(resource).toEqual({
			...careBearData.bears[1],
			attributes: { ...careBearData.bears[1].attributes, name: "Tiernosito" },
		});
	});

	it("formats with a relationship renaming", () => {
		const base = {
			...flatCareBearData.bears[0],
			casa: flatCareBearData.homes[1],
		};

		const resource = normalizeResource("bears", base, careBearSchema, {
			bears: {
				home: "casa",
			},
		});

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				...careBearData.bears[1].relationships,
				home: { type: "homes", id: "2" },
			},
		});
	});

	it("formats with a relationship renaming and a nonstandard id", () => {
		const powaz = {
			...flatCareBearData.powers.map((p) => ({
				...p,
				powerId: undefined,
				powaId: p.powerId,
			})),
		};

		const base = {
			...flatCareBearData.bears[0],
			powers: undefined,
			powaz: [powaz[0]],
		};

		const resource = normalizeResource("bears", base, careBearSchema, {
			bears: {
				powers: "powaz",
			},
			powers: {
				id: "powaId",
			},
		});

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				...careBearData.bears[1].relationships,
				powers: [{ type: "powers", id: "careBearStare" }],
			},
		});
	});

	it("formats with a function", () => {
		const base = {
			...flatCareBearData.bears[0],
			nombre: "Tiernosito",
		};

		const resource = normalizeResource("bears", base, careBearSchema, {
			bears: {
				name: (res) => `${res.name} a.k.a. ${res.nombre}`,
			},
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

	it("keeps undefined relationships undefined", () => {
		const base = omit(flatCareBearData.bears[0], ["home", "powers"]);

		const resource = normalizeResource("bears", base, careBearSchema);

		expect(resource).toEqual({
			...careBearData.bears[1],
			relationships: {
				bestFriend: null,
				home: undefined,
				powers: undefined,
			},
		});
	});
});

describe("createGraphFromTrees", () => {
	it("makes a graph from a single resource", () => {
		const resource = flatCareBearData.bears[0];

		const graph = createGraphFromTrees("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: {},
		});
	});

	it("makes a graph from multiple resources", () => {
		const resources = flatCareBearData.bears;

		const graph = createGraphFromTrees("bears", resources, careBearSchema);

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

		const graph = createGraphFromTrees(
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

		const graph = createGraphFromTrees("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: pick(careBearData.homes, ["1"]),
		});
	});

	it("walks a singly nested to-many resource", () => {
		const resource = {
			...flatCareBearData.bears[2],
			powers: flatCareBearData.powers.slice(0, 2),
		};

		const graph = createGraphFromTrees("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["3"]),
			powers: pick(careBearData.powers, ["careBearStare", "makeWish"]),
			homes: {},
		});
	});

	it("walks a doubly nested to-many resource", () => {
		const resource = {
			...flatCareBearData.bears[2],
			powers: flatCareBearData.powers.slice(0, 2).map((power) => ({
				...power,
				wielders: power.wielders.map((bearId) =>
					flatCareBearData.bears.find((b) => b.id === bearId),
				),
			})),
		};

		const graph = createGraphFromTrees("bears", [resource], careBearSchema);

		expect(graph).toEqual({
			bears: omit(careBearData.bears, ["5"]),
			powers: pick(careBearData.powers, ["careBearStare", "makeWish"]),
			homes: {},
		});
	});
});

describe("the zoo", () => {
	it("deals with a weird doubly nested resource (2024-06-21)", () => {
		const resource = {
			id: "1",
			name: "Care-a-Lot",
			location: "Kingdom of Caring",
			caringMeter: 1,
			isInClouds: true,
			residents: [
				{
					id: "1",
					name: "Tenderheart Bear",
					yearIntroduced: 1982,
					bellyBadge: "red heart with pink outline",
					furColor: "tan",
					powers: [
						{
							powerId: "careBearStare",
							name: "Care Bear Stare",
							description: "Purges evil.",
							type: "group power",
							wielders: [
								{
									id: "1",
									name: "Tenderheart Bear",
									yearIntroduced: 1982,
									bellyBadge: "red heart with pink outline",
									furColor: "tan",
								},
								{
									id: "2",
									name: "Cheer Bear",
									yearIntroduced: 1982,
									bellyBadge: "rainbow",
									furColor: "carnation pink",
								},
								{
									id: "3",
									name: "Wish Bear",
									yearIntroduced: 1982,
									bellyBadge: "shooting star",
									furColor: "turquoise",
								},
							],
						},
					],
				},
				{
					id: "2",
					name: "Cheer Bear",
					yearIntroduced: 1982,
					bellyBadge: "rainbow",
					furColor: "carnation pink",
					powers: [
						{
							powerId: "careBearStare",
							name: "Care Bear Stare",
							description: "Purges evil.",
							type: "group power",
							wielders: [
								{
									id: "1",
									name: "Tenderheart Bear",
									yearIntroduced: 1982,
									bellyBadge: "red heart with pink outline",
									furColor: "tan",
								},
								{
									id: "2",
									name: "Cheer Bear",
									yearIntroduced: 1982,
									bellyBadge: "rainbow",
									furColor: "carnation pink",
								},
								{
									id: "3",
									name: "Wish Bear",
									yearIntroduced: 1982,
									bellyBadge: "shooting star",
									furColor: "turquoise",
								},
							],
						},
					],
				},
				{
					id: "3",
					name: "Wish Bear",
					yearIntroduced: 1982,
					bellyBadge: "shooting star",
					furColor: "turquoise",
					powers: [
						{
							powerId: "careBearStare",
							name: "Care Bear Stare",
							description: "Purges evil.",
							type: "group power",
							wielders: [
								{
									id: "1",
									name: "Tenderheart Bear",
									yearIntroduced: 1982,
									bellyBadge: "red heart with pink outline",
									furColor: "tan",
								},
								{
									id: "2",
									name: "Cheer Bear",
									yearIntroduced: 1982,
									bellyBadge: "rainbow",
									furColor: "carnation pink",
								},
								{
									id: "3",
									name: "Wish Bear",
									yearIntroduced: 1982,
									bellyBadge: "shooting star",
									furColor: "turquoise",
								},
							],
						},
						{
							powerId: "makeWish",
							name: "Make a Wish",
							description: "Makes a wish on Twinkers",
							type: "individual power",
							wielders: [
								{
									id: "3",
									name: "Wish Bear",
									yearIntroduced: 1982,
									bellyBadge: "shooting star",
									furColor: "turquoise",
								},
							],
						},
					],
				},
			],
		};

		const graph = createGraphFromTrees("homes", [resource], careBearSchema);

		expect(graph).toStrictEqual({
			bears: {
				"1": {
					type: "bears",
					id: "1",
					attributes: {
						id: "1",
						name: "Tenderheart Bear",
						yearIntroduced: 1982,
						bellyBadge: "red heart with pink outline",
						furColor: "tan",
					},
					relationships: { powers: careBearData.bears[1].relationships.powers },
				},
				"2": {
					type: "bears",
					id: "2",
					attributes: {
						id: "2",
						name: "Cheer Bear",
						yearIntroduced: 1982,
						bellyBadge: "rainbow",
						furColor: "carnation pink",
					},
					relationships: { powers: careBearData.bears[2].relationships.powers },
				},
				"3": {
					type: "bears",
					id: "3",
					attributes: {
						id: "3",
						name: "Wish Bear",
						yearIntroduced: 1982,
						bellyBadge: "shooting star",
						furColor: "turquoise",
					},
					relationships: { powers: careBearData.bears[3].relationships.powers },
				},
			},
			homes: {
				"1": {
					type: "homes",
					id: "1",
					attributes: {
						id: "1",
						name: "Care-a-Lot",
						location: "Kingdom of Caring",
						caringMeter: 1,
						isInClouds: true,
					},
					relationships: {
						residents: [
							{
								type: "bears",
								id: "1",
							},
							{
								type: "bears",
								id: "2",
							},
							{
								type: "bears",
								id: "3",
							},
						],
					},
				},
			},
			powers: {
				careBearStare: {
					type: "powers",
					id: "careBearStare",
					attributes: {
						powerId: "careBearStare",
						name: "Care Bear Stare",
						description: "Purges evil.",
						type: "group power",
					},
					relationships: {
						wielders: [
							{
								type: "bears",
								id: "1",
							},
							{
								type: "bears",
								id: "2",
							},
							{
								type: "bears",
								id: "3",
							},
						],
					},
				},
				makeWish: {
					type: "powers",
					id: "makeWish",
					attributes: {
						powerId: "makeWish",
						name: "Make a Wish",
						description: "Makes a wish on Twinkers",
						type: "individual power",
					},
					relationships: {
						wielders: [
							{
								type: "bears",
								id: "3",
							},
						],
					},
				},
			},
		});
	});
});
