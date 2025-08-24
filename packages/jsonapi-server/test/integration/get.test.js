import { describe, expect, it } from "vitest";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line
import { parseRequest } from "../../src/parse-request.js";
import { api, makeRequest } from "../helpers.js";
import { omit, pick } from "lodash-es";

const tenderheart = careBearData.bears[1];

describe("requests with no subqueries", () => {
	it("fetches a single resource", async () => {
		expect(await api.get("/bears/1")).toStrictEqual({
			data: {
				type: "bears",
				id: "1",
				attributes: omit(tenderheart.attributes, ["id"]),
				relationships: {},
			},
		});
	});

	it("fetches a single resource with a differing idAttribute", async () => {
		expect(await api.get("/powers/careBearStare")).toStrictEqual({
			data: {
				type: "powers",
				id: "careBearStare",
				attributes: omit(careBearData.powers.careBearStare.attributes, ["powerId"]),
				relationships: {},
			},
		});
	});

	it("multiple resources", async () => {
		const request = "/bears";

		expect(await makeRequest(request)).toStrictEqual({
			data: Object.entries(careBearData.bears).map(([id, bear]) => ({
				type: "bears",
				id,
				attributes: omit(bear.attributes, ["id"]),
				relationships: {},
			})),
		});
	});

	it("limits fields on the root query with the id", async () => {
		const request = "/bears?fields[bears]=name,bellyBadge";

		expect(await makeRequest(request)).toStrictEqual({
			data: Object.entries(careBearData.bears).map(([id, bear]) => ({
				type: "bears",
				id,
				attributes: pick(bear.attributes, ["name", "bellyBadge"]),
				relationships: {},
			})),
		});
	});

	describe("filter", () => {
		it("filters fields on a single criterion", async () => {
			const request = "/bears?filter[bellyBadge]=rainbow";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(pick(careBearData.bears, ["2"])).map(
					([id, bear]) => ({
						type: "bears",
						id,
						attributes: omit(bear.attributes, ["id"]),
						relationships: {},
					}),
				),
			});
		});

		it("filters fields on a single criterion of a numeric type", async () => {
			const request = "/bears?filter[yearIntroduced]=1982";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(pick(careBearData.bears, ["1", "2", "3"])).map(
					([id, bear]) => ({
						type: "bears",
						id,
						attributes: omit(bear.attributes, ["id"]),
						relationships: {},
					}),
				),
			});
		});

		it("filters fields on multiple criteria", async () => {
			const request =
				"/bears?filter[yearIntroduced]=1982&filter[bellyBadge]=rainbow";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(pick(careBearData.bears, ["2"])).map(
					([id, bear]) => ({
						type: "bears",
						id,
						attributes: omit(bear.attributes, ["id"]),
						relationships: {},
					}),
				),
			});
		});

		it("filters with an expression", async () => {
			const request = "/bears?filter[yearIntroduced][$lt]=2000";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(pick(careBearData.bears, ["1", "2", "3"])).map(
					([id, bear]) => ({
						type: "bears",
						id,
						attributes: omit(bear.attributes, ["id"]),
						relationships: {},
					}),
				),
			});
		});

		it("filters with a loosely written expression", async () => {
			const request = "/bears?filter[yearIntroduced]={$lt: 2000}";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(pick(careBearData.bears, ["1", "2", "3"])).map(
					([id, bear]) => ({
						type: "bears",
						id,
						attributes: omit(bear.attributes, ["id"]),
						relationships: {},
					}),
				),
			});
		});
	});

	describe("sorting", () => {
		it("sorts ascending on a single field", async () => {
			const request = "/bears?sort=yearIntroduced";

			expect(await makeRequest(request)).toStrictEqual({
				data: Object.entries(
					pick(careBearData.bears, ["1", "2", "3", "5"]),
				).map(([id, bear]) => ({
					type: "bears",
					id,
					attributes: omit(bear.attributes, ["id"]),
					relationships: {},
				})),
			});
		});

		it("sorts descending on a single field", async () => {
			const request = "/bears?sort=-yearIntroduced";

			expect(await makeRequest(request)).toStrictEqual({
				data: ["5", "1", "2", "3"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {},
				})),
			});
		});

		it("doesn't allow sorting on an invalid field", async () => {
			const request = "/bears?sort=-foo";
			expect(() => makeRequest(request)).rejects.toThrowError();
		});

		it("sorts on multiple fields", async () => {
			const request = "/bears?sort=-yearIntroduced,name";

			expect(await makeRequest(request)).toStrictEqual({
				data: ["5", "2", "1", "3"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {},
				})),
			});
		});
	});

	describe("pagination", () => {
		it("limits results", async () => {
			const request = "/bears?page[size]=2&page[number]=1";

			expect(await makeRequest(request)).toStrictEqual({
				data: ["1", "2"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {},
				})),
			});
		});

		it("limits and offsets results", async () => {
			const request = "/bears?page[size]=2&page[number]=2";

			expect(await makeRequest(request)).toStrictEqual({
				data: ["3", "5"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {},
				})),
			});
		});
	});
});

describe("requests with subqueries", () => {
	it("parses a request for a nested singular relationship", async () => {
		const request = "/bears/1?include=home";

		expect(await makeRequest(request)).toStrictEqual({
			data: {
				type: "bears",
				id: "1",
				attributes: omit(tenderheart.attributes, ["id"]),
				relationships: {
					home: { data: { type: "homes", id: "1" } },
				},
			},
			included: [
				{
					type: "homes",
					id: "1",
					attributes: omit(careBearData.homes[1].attributes, ["id"]),
					relationships: {},
				},
			],
		});
	});

	it("parses a request for a two relationships", async () => {
		const request = "/bears/1?include=home,powers";

		expect(await makeRequest(request)).toStrictEqual({
			data: {
				type: "bears",
				id: "1",
				attributes: omit(tenderheart.attributes, ["id"]),
				relationships: {
					home: { data: { type: "homes", id: "1" } },
					powers: { data: [{ type: "powers", id: "careBearStare" }] },
				},
			},
			included: [
				{
					type: "homes",
					id: "1",
					attributes: omit(careBearData.homes[1].attributes, ["id"]),
					relationships: {},
				},
				{
					type: "powers",
					id: "careBearStare",
					attributes: omit(careBearData.powers.careBearStare.attributes, [
						"powerId",
					]),
					relationships: {},
				},
			],
		});
	});

	it("parses a request for a doubly nested relationship", async () => {
		const request = "/homes/1?include=residents,residents.powers";

		expect(await makeRequest(request)).toStrictEqual({
			data: {
				type: "homes",
				id: "1",
				attributes: omit(careBearData.homes[1].attributes, ["id"]),
				relationships: {
					residents: {
						data: [
							{ type: "bears", id: "1" },
							{ type: "bears", id: "2" },
							{ type: "bears", id: "3" },
						],
					},
				},
			},
			included: [
				...["1", "2"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {
						powers: { data: [{ type: "powers", id: "careBearStare" }] },
					},
				})),
				{
					type: "bears",
					id: "3",
					attributes: omit(careBearData.bears[3].attributes, ["id"]),
					relationships: {
						powers: {
							data: [
								{ type: "powers", id: "careBearStare" },
								{ type: "powers", id: "makeWish" },
							],
						},
					},
				},
				{
					type: "powers",
					id: "careBearStare",
					attributes: omit(careBearData.powers.careBearStare.attributes, [
						"powerId",
					]),
					relationships: {},
				},
				{
					type: "powers",
					id: "makeWish",
					attributes: omit(careBearData.powers.makeWish.attributes, [
						"powerId",
					]),
					relationships: {},
				},
			],
		});
	});

	it("parses a request for a triply nested relationship", async () => {
		const request =
			"/homes/1?include=residents,residents.powers,residents.powers.wielders";

		expect(await makeRequest(request)).toStrictEqual({
			data: {
				type: "homes",
				id: "1",
				attributes: omit(careBearData.homes[1].attributes, ["id"]),
				relationships: {
					residents: {
						data: [
							{ type: "bears", id: "1" },
							{ type: "bears", id: "2" },
							{ type: "bears", id: "3" },
						],
					},
				},
			},
			included: [
				...["1", "2"].map((id) => ({
					type: "bears",
					id,
					attributes: omit(careBearData.bears[id].attributes, ["id"]),
					relationships: {
						powers: { data: [{ type: "powers", id: "careBearStare" }] },
					},
				})),
				{
					type: "bears",
					id: "3",
					attributes: omit(careBearData.bears[3].attributes, ["id"]),
					relationships: {
						powers: {
							data: [
								{ type: "powers", id: "careBearStare" },
								{ type: "powers", id: "makeWish" },
							],
						},
					},
				},
				{
					type: "powers",
					id: "careBearStare",
					attributes: omit(careBearData.powers.careBearStare.attributes, [
						"powerId",
					]),
					relationships: {
						wielders: {
							data: [
								{ type: "bears", id: "1" },
								{ type: "bears", id: "2" },
								{ type: "bears", id: "3" },
							],
						},
					},
				},
				{
					type: "powers",
					id: "makeWish",
					attributes: omit(careBearData.powers.makeWish.attributes, [
						"powerId",
					]),
					relationships: { wielders: { data: [{ type: "bears", id: "3" }] } },
				},
			],
		});
	});

	it("parses a request for a relationship of the same type", () => {
		const query = parseRequest(careBearSchema, {
			type: "bears",
			include: "bestFriend",
		});

		expect(query).toStrictEqual({
			type: "bears",
			select: [
				...Object.keys(careBearSchema.resources.bears.attributes),
				{
					bestFriend: {
						select: Object.keys(careBearSchema.resources.bears.attributes),
					},
				},
			],
		});
	});

	it("narrows the fields on a nested resource", async () => {
		const query = parseRequest(careBearSchema, {
			type: "bears",
			include: "home",
			fields: { homes: "name" },
		});

		expect(query).toStrictEqual({
			type: "bears",
			select: [
				...Object.keys(careBearSchema.resources.bears.attributes),
				{
					home: {
						select: ["name", "id"],
					},
				},
			],
		});
	});
});
