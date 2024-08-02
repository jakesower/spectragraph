import { describe, expect, it } from "vitest";
import careBearSchema from "../fixtures/care-bears.schema.json";
import { parseRequest } from "../../src/parse-request.js";
import { Schema } from "data-prism";

describe("requests with no subqueries", () => {
	it("parses a request for multiple resources", async () => {
		const query = parseRequest(careBearSchema as Schema, { type: "bears" });

		expect(query).toStrictEqual({
			type: "bears",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("parses a request for a single resource", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "bears",
			id: "1",
		});

		expect(query).toStrictEqual({
			type: "bears",
			id: "1",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		});
	});

	it("limits fields on the root query with the id", () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "bears",
			id: "1",
			fields: { bears: "name,bellyBadge" },
		});

		expect(query).toStrictEqual({
			type: "bears",
			id: "1",
			select: ["name", "bellyBadge", "id"],
		});
	});

	it("limits fields on the root query with a nonstandard id", () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "powers",
			id: "careBearStare",
			fields: { powers: "name,type" },
		});

		expect(query).toStrictEqual({
			type: "powers",
			id: "careBearStare",
			select: ["name", "type", "powerId"],
		});
	});

	describe("filter", () => {
		it("filters fields on a single criterion", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: 1982 },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: 1982 },
			});
		});

		it("filters fields on multiple criteria", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: 1982, bellyBadge: "rainbow" },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: 1982, bellyBadge: "rainbow" },
			});
		});

		it("filters with an expression", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: { $lt: 1985 } },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: { $lt: 1985 } },
			});
		});

		it("filters with a string expression", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				filter: { yearIntroduced: "{ $lt: 1985 }" },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				where: { yearIntroduced: { $lt: 1985 } },
			});
		});
	});

	describe("sorting", () => {
		it("sorts ascending on a single field", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				sort: "yearIntroduced",
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				order: [{ yearIntroduced: "asc" }],
			});
		});

		it("sorts descending on a single field", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				sort: "-yearIntroduced",
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				order: [{ yearIntroduced: "desc" }],
			});
		});

		it("doesn't allow sorting on an invalid field", () => {
			expect(() =>
				parseRequest(careBearSchema as Schema, {
					type: "bears",
					sort: "foo",
				}),
			).toThrowError();
		});

		it("sorts on multiple fields", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				sort: "-yearIntroduced,name",
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				order: [{ yearIntroduced: "desc" }, { name: "asc" }],
			});
		});

		it("sorts on an valid field when a nested resource is requested", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				sort: "yearIntroduced",
				include: "home",
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: [
					...Object.keys(careBearSchema.resources.bears.attributes),
					{
						home: {
							select: Object.keys(careBearSchema.resources.homes.attributes),
						},
					},
				],
				order: [{ yearIntroduced: "asc" }],
			});
		});
	});

	describe("pagination", () => {
		it("limits results", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				page: { size: 3 },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				limit: 3,
			});
		});

		it("limits and offsets results", () => {
			const query = parseRequest(careBearSchema as Schema, {
				type: "bears",
				page: { size: 3, number: 2 },
			});

			expect(query).toStrictEqual({
				type: "bears",
				select: Object.keys(careBearSchema.resources.bears.attributes),
				limit: 3,
				offset: 3,
			});
		});
	});
});

describe("requests with subqueries", () => {
	it("parses a request for a nested singular relationship", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "bears",
			include: "home",
		});

		expect(query).toStrictEqual({
			type: "bears",
			select: [
				...Object.keys(careBearSchema.resources.bears.attributes),
				{
					home: {
						select: Object.keys(careBearSchema.resources.homes.attributes),
					},
				},
			],
		});
	});

	it("parses a request for a two relationships", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "bears",
			include: "home,powers",
		});

		expect(query).toStrictEqual({
			type: "bears",
			select: [
				...Object.keys(careBearSchema.resources.bears.attributes),
				{
					home: {
						select: Object.keys(careBearSchema.resources.homes.attributes),
					},
				},
				{
					powers: {
						select: Object.keys(careBearSchema.resources.powers.attributes),
					},
				},
			],
		});
	});

	it("parses a request for a doubly nested relationship", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "homes",
			include: "residents,residents.powers",
		});

		expect(query).toStrictEqual({
			type: "homes",
			select: [
				...Object.keys(careBearSchema.resources.homes.attributes),
				{
					residents: {
						select: [
							...Object.keys(careBearSchema.resources.bears.attributes),
							{
								powers: {
									select: Object.keys(
										careBearSchema.resources.powers.attributes,
									),
								},
							},
						],
					},
				},
			],
		});
	});

	it("parses a request for a triply nested relationship", async () => {
		const query = parseRequest(careBearSchema as Schema, {
			type: "homes",
			include: "residents,residents.powers,residents.powers.wielders",
		});

		expect(query).toStrictEqual({
			type: "homes",
			select: [
				...Object.keys(careBearSchema.resources.homes.attributes),
				{
					residents: {
						select: [
							...Object.keys(careBearSchema.resources.bears.attributes),
							{
								powers: {
									select: [
										...Object.keys(careBearSchema.resources.powers.attributes),
										{
											wielders: {
												select: Object.keys(
													careBearSchema.resources.bears.attributes,
												),
											},
										},
									],
								},
							},
						],
					},
				},
			],
		});
	});

	it("parses a request for a relationship of the same type", () => {
		const query = parseRequest(careBearSchema as Schema, {
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
		const query = parseRequest(careBearSchema as Schema, {
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
