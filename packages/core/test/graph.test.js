import { expect, it, describe } from "vitest";
import { mapValues, omit, pick } from "lodash-es";
import {
	createGraphFromResources,
	linkInverses,
	mergeGraphs,
} from "../src/graph.js";
import {
	careBearSchema,
	careBearData,
	careBearDataFlat as flatCareBearData,
} from "@data-prism/test-fixtures";

describe("linkInverses", () => {
	it("doesn't change anything for an already linked graph", () => {
		const linked = linkInverses(careBearSchema, careBearData);

		expect(linked).toEqual(careBearData);
	});

	it("links a one-to-many relationship", () => {
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: omit(bear.relationships, ["home"]),
		}));

		const linked = linkInverses(careBearSchema, {
			...careBearData,
			bears: unlinkedBears,
		});

		expect(linked).toEqual(careBearData);
	});

	it("links a many-to-one relationship", () => {
		const unlinkedHomes = mapValues(careBearData.homes, (home) => ({
			...home,
			relationships: omit(home.relationships, ["residents"]),
		}));

		const linked = linkInverses(careBearSchema, {
			...careBearData,
			homes: unlinkedHomes,
		});

		expect(linked).toEqual(careBearData);
	});

	it("links a many-to-many relationship", () => {
		const unlinkedBears = mapValues(careBearData.bears, (bear) => ({
			...bear,
			relationships: { ...bear.relationships, powers: undefined },
		}));

		const linked = linkInverses(careBearSchema, {
			...careBearData,
			bears: unlinkedBears,
		});

		expect(linked).toEqual(careBearData);
	});
});

describe("mergeGraphs", () => {
	it("merges graphs with different resource types", () => {
		const left = { bears: careBearData.bears };
		const right = { homes: careBearData.homes };

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(pick(careBearData, ["bears", "homes"]));
	});

	it("merges graphs with resources of the same type", () => {
		const left = { bears: pick(careBearData.bears, ["1"]) };
		const right = { bears: omit(careBearData.bears, ["1"]) };

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(pick(careBearData, ["bears"]));
	});

	it("merges graphs with a mix of things", () => {
		const left = {
			bears: pick(careBearData.bears, ["1"]),
			powers: careBearData.powers,
		};

		const right = {
			bears: omit(careBearData.bears, ["1"]),
			homes: careBearData.homes,
		};

		const merged = mergeGraphs(left, right);

		expect(merged).toEqual(careBearData);
	});

	it("merges resources with different attributes available", () => {
		const left = {
			bears: {
				1: { type: "bears", id: "1", attributes: { name: "Tenderheart Bear" } },
			},
		};

		const right = {
			bears: {
				1: {
					type: "bears",
					id: "1",
					attributes: { bellyBadge: "red heart with pink outline" },
				},
			},
		};

		const merged = mergeGraphs(left, right);

		expect(merged.bears["1"].attributes).toEqual({
			name: "Tenderheart Bear",
			bellyBadge: "red heart with pink outline",
		});
	});
});

describe("createGraphFromResources", () => {
	it("makes a graph from a single resource", () => {
		const resource = flatCareBearData.bears[0];

		const graph = createGraphFromResources(careBearSchema, "bears", [resource]);

		expect(graph).toEqual({
			bears: pick(careBearData.bears, ["1"]),
			powers: {},
			homes: {},
		});
	});

	it("makes a graph from multiple resources", () => {
		const resources = flatCareBearData.bears;

		const graph = createGraphFromResources(careBearSchema, "bears", resources);

		expect(graph).toEqual({
			bears: careBearData.bears,
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

		const graph = createGraphFromResources(careBearSchema, "bears", [resource]);

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

		const graph = createGraphFromResources(careBearSchema, "bears", [resource]);

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

		const graph = createGraphFromResources(careBearSchema, "bears", [resource]);

		expect(graph).toEqual({
			bears: omit(careBearData.bears, ["5"]),
			powers: pick(careBearData.powers, ["careBearStare", "makeWish"]),
			homes: {},
		});
	});

	describe("bugs from the wild", () => {
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

			const graph = createGraphFromResources(careBearSchema, "homes", [
				resource,
			]);

			expect(graph).toStrictEqual({
				bears: {
					1: {
						type: "bears",
						id: "1",
						attributes: {
							id: "1",
							name: "Tenderheart Bear",
							yearIntroduced: 1982,
							bellyBadge: "red heart with pink outline",
							furColor: "tan",
						},
						relationships: {
							powers: careBearData.bears[1].relationships.powers,
						},
					},
					2: {
						type: "bears",
						id: "2",
						attributes: {
							id: "2",
							name: "Cheer Bear",
							yearIntroduced: 1982,
							bellyBadge: "rainbow",
							furColor: "carnation pink",
						},
						relationships: {
							powers: careBearData.bears[2].relationships.powers,
						},
					},
					3: {
						type: "bears",
						id: "3",
						attributes: {
							id: "3",
							name: "Wish Bear",
							yearIntroduced: 1982,
							bellyBadge: "shooting star",
							furColor: "turquoise",
						},
						relationships: {
							powers: careBearData.bears[3].relationships.powers,
						},
					},
				},
				homes: {
					1: {
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
});
