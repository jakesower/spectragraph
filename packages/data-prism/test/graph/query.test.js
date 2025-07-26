import { expect, it, describe } from "vitest";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import { createQueryGraph, queryGraph } from "../../src/graph.js";

const graph = createQueryGraph(careBearData);

describe("queryTree core", () => {
	it("fetches a single resource with array notation", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("fetches a single resource with object notation", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: { name: "name" },
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("using the immediate evaluation function", async () => {
		const result = queryGraph(careBearData, {
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("fetches a single resource with mixed notation", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: ["name", { yearIntroduced: "yearIntroduced" }],
		});

		expect(result).toEqual({
			name: "Tenderheart Bear",
			yearIntroduced: 1982,
		});
	});

	it("fetches a single resource with its id", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: ["id", "name"],
		});

		expect(result).toEqual({ id: "1", name: "Tenderheart Bear" });
	});

	it("fetches a single resource without its id", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: ["name"],
		});

		expect(result).toEqual({ name: "Tenderheart Bear" });
	});

	it("fetches a single resource and maps property names", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: {
				nombre: "name",
			},
		});

		expect(result).toEqual({ nombre: "Tenderheart Bear" });
	});

	it("fetches a property from multiple resources", async () => {
		const result = graph.query({
			type: "bears",
			select: { name: "name" },
		});

		const expected = [
			"Tenderheart Bear",
			"Cheer Bear",
			"Wish Bear",
			"Smart Heart Bear",
		].map((name) => ({ name }));

		expect(result).toEqual(expected);
	});

	it("fetches null for a nonexistent resource", async () => {
		const result = graph.query({
			type: "bears",
			id: "6",
			select: ["id"],
		});

		expect(result).toEqual(null);
	});

	it("allows for selecting paths", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: { id: "id", homeName: "home.name", home: { select: ["name"] } },
		});

		expect(result).toEqual({
			id: "1",
			homeName: "Care-a-Lot",
			home: { name: "Care-a-Lot" },
		});
	});

	it("allows for selecting without selecting the attribute in the related resource", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: { id: "id", homeName: "home.name", home: { select: ["id"] } },
		});

		expect(result).toEqual({
			id: "1",
			homeName: "Care-a-Lot",
			home: { id: "1" },
		});
	});

	it("allows for selecting without selecting the related resource", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: { id: "id", homeName: "home.name" },
		});

		expect(result).toEqual({
			id: "1",
			homeName: "Care-a-Lot",
		});
	});

	it("allows for selecting nested paths", async () => {
		const result = graph.query({
			type: "bears",
			id: "2",
			select: { id: "id", bestFriendHomeName: "bestFriend.home.name" },
		});

		expect(result).toEqual({
			id: "2",
			bestFriendHomeName: "Care-a-Lot",
		});
	});

	it("returns null for missing relationships in the path", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: { id: "id", bestFriendHomeName: "bestFriend.home.name" },
		});

		expect(result).toEqual({
			id: "1",
			bestFriendHomeName: null,
		});
	});

	it("walks to-many paths", async () => {
		const result = graph.query({
			type: "homes",
			id: "1",
			select: { name: "name", residentNames: "residents.$.name" },
		});

		expect(result).toEqual({
			name: "Care-a-Lot",
			residentNames: ["Tenderheart Bear", "Cheer Bear", "Wish Bear"],
		});
	});

	it("walks nested to-many paths", async () => {
		const result = graph.query({
			type: "homes",
			id: "1",
			select: { name: "name", bestFriendNames: "residents.$.bestFriend.name" },
		});

		expect(result).toEqual({
			name: "Care-a-Lot",
			bestFriendNames: [null, "Wish Bear", "Cheer Bear"],
		});
	});

	it("disallows queries with no 'type'", async () => {
		await expect(async () => {
			graph.query({
				select: ["name"],
			});
		}).rejects.toThrowError();
	});

	it("fetches a single resource with a many-to-one relationship", async () => {
		const q = {
			type: "bears",
			id: "1",
			select: ["home"],
		};

		const result = graph.query(q);

		expect(result).toEqual({
			home: { type: "homes", id: "1" },
		});
	});

	it("a single resource with a one-to-many relationship", async () => {
		const q = {
			type: "homes",
			id: "1",
			select: ["residents"],
		};

		const result = await graph.query(q);

		expect(result).toEqual({
			residents: [
				{ type: "bears", id: "1" },
				{ type: "bears", id: "2" },
				{ type: "bears", id: "3" },
			],
		});
	});

	it("fetches a single resource with a subset of props", async () => {
		const result = graph.query({
			type: "bears",
			id: "1",
			select: ["id", "name", "furColor"],
		});

		expect(result).toEqual({
			id: "1",
			name: "Tenderheart Bear",
			furColor: "tan",
		});
	});

	it("fetches a single resource with a subset of props on a relationship", async () => {
		const q = {
			type: "bears",
			id: "1",
			select: { home: { select: { caringMeter: "caringMeter" } } },
		};

		const result = await graph.query(q);

		expect(result).toEqual({ home: { caringMeter: 1 } });
	});

	it("uses explicitly set id fields", async () => {
		const result = await graph.query({
			type: "powers",
			id: "careBearStare",
			select: {
				powerId: "powerId",
			},
		});

		expect(result).toEqual({ powerId: "careBearStare" });
	});

	it("fetches a single resource ref with many-to-many relationship", async () => {
		const result = await graph.query({
			type: "bears",
			id: "1",
			select: ["powers"],
		});

		expect(result).toEqual({
			powers: [{ type: "powers", id: "careBearStare" }],
		});
	});

	it("fetches a single resource with many-to-many relationship and a `type` property", async () => {
		const result = await graph.query({
			type: "bears",
			id: "1",
			select: { powers: { select: ["type"] } },
		});

		expect(result).toEqual({
			powers: [{ type: "group power" }],
		});
	});

	it("fetches multiple subqueries of various types", async () => {
		const result = await graph.query({
			type: "bears",
			id: "1",
			select: {
				home: {
					select: ["residents"],
				},
				powers: "powers",
			},
		});

		expect(result).toEqual({
			home: {
				residents: [
					{ type: "bears", id: "1" },
					{ type: "bears", id: "2" },
					{ type: "bears", id: "3" },
				],
			},
			powers: [{ type: "powers", id: "careBearStare" }],
		});
	});

	it("handles subqueries between the same type", async () => {
		const result = await graph.query({
			type: "bears",
			select: {
				id: "id",
				bestFriend: "bestFriend",
			},
		});

		expect(result).toEqual([
			{ id: "1", bestFriend: null },
			{ id: "2", bestFriend: { type: "bears", id: "3" } },
			{ id: "3", bestFriend: { type: "bears", id: "2" } },
			{ id: "5", bestFriend: null },
		]);
	});

	it("errors out on undefined resources", async () => {
		await expect(async () => {
			const graph = {
				...careBearData,
				bears: {
					...careBearData.bears,
					1: {
						...careBearData.bears[1],
						relationships: {},
					},
				},
			};

			queryGraph(graph, {
				type: "bears",
				id: "1",
				select: {
					name: "name",
					home: { select: ["name"] },
				},
			});
		}).rejects.toThrowError();
	});

	describe("dot notation", () => {
		it("fetches nested fields with dot notation", async () => {
			const result = await graph.query({
				type: "bears",
				select: {
					name: "name",
					residence: "home.name",
				},
			});

			expect(result).toEqual([
				{ name: "Tenderheart Bear", residence: "Care-a-Lot" },
				{ name: "Cheer Bear", residence: "Care-a-Lot" },
				{ name: "Wish Bear", residence: "Care-a-Lot" },
				{ name: "Smart Heart Bear", residence: null },
			]);
		});

		it("fetches doubly nested fields with dot notation", async () => {
			const result = await graph.query({
				type: "bears",
				select: {
					name: "name",
					friendsResidence: "bestFriend.home.name",
				},
			});

			expect(result).toEqual([
				{ name: "Tenderheart Bear", friendsResidence: null },
				{ name: "Cheer Bear", friendsResidence: "Care-a-Lot" },
				{ name: "Wish Bear", friendsResidence: "Care-a-Lot" },
				{ name: "Smart Heart Bear", friendsResidence: null },
			]);
		});
	});
});
