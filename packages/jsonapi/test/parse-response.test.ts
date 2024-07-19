import { Schema, createStore } from "data-prism";
import { expect, it } from "vitest";
import careBearSchema from "./fixtures/care-bears.schema.json";
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { parseResponse } from "../src/parse-response";
import {
	allBearsResult,
	allBearsResponse,
} from "./fixtures/formatted-care-bear-data.js";

const store = createStore(careBearSchema as Schema, careBearData);

it("parses a response with multiple resources", async () => {
	const result = parseResponse(
		careBearSchema as Schema,
		{
			type: "bears",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		},
		allBearsResponse,
	);

	expect(result).toStrictEqual(allBearsResult);
});

it("parses a response with a single resource", async () => {
	const result = parseResponse(
		careBearSchema as Schema,
		{
			type: "bears",
			id: "1",
			select: ["name"],
		},
		{
			data: {
				type: "bears",
				id: "1",
				attributes: { name: "Tenderheart Bear" },
			},
		},
	);

	expect(result).toStrictEqual({ name: "Tenderheart Bear" });
});

it("parses a response with a nested resource", async () => {
	const result = parseResponse(
		careBearSchema as Schema,
		{
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		},
		{
			data: {
				type: "bears",
				id: "1",
				attributes: { name: "Tenderheart Bear" },
				relationships: {
					home: { data: { type: "homes", id: "1" } },
				},
			},
			included: [
				{
					type: "homes",
					id: "1",
					attributes: { name: "Care-a-Lot" },
					relationships: {},
				},
			],
		},
	);

	expect(result).toStrictEqual({
		name: "Tenderheart Bear",
		home: { name: "Care-a-Lot" },
	});
});

it("parses a response with a nested resource", async () => {
	const result = parseResponse(
		careBearSchema as Schema,
		{
			type: "bears",
			id: "1",
			select: ["name", { home: { select: ["name"] } }],
		},
		{
			data: {
				type: "bears",
				id: "1",
				attributes: { name: "Tenderheart Bear" },
				relationships: {
					home: { data: { type: "homes", id: "1" } },
				},
			},
			included: [
				{
					type: "homes",
					id: "1",
					attributes: { name: "Care-a-Lot" },
					relationships: {},
				},
			],
		},
	);

	expect(result).toStrictEqual({
		name: "Tenderheart Bear",
		home: { name: "Care-a-Lot" },
	});
});

it("parses a response with a doubly nested resource", async () => {
	const query = {
		type: "homes",
		id: "1",
		select: [
			"id",
			"name",
			{
				residents: {
					select: ["id", "name", { powers: { select: ["powerId", "name"] } }],
				},
			},
		],
	};

	const result = parseResponse(careBearSchema as Schema, query, {
		data: {
			type: "homes",
			id: "1",
			attributes: { name: "Care-a-Lot" },
			relationships: {
				residents: {
					data: ["1", "2", "3"].map((id) => ({
						type: "bears",
						id,
					})),
				},
			},
		},
		included: [
			{
				type: "bears",
				id: "1",
				attributes: { name: "Tenderheart Bear" },
				relationships: {
					powers: { data: [{ type: "powers", id: "careBearStare" }] },
				},
			},
			{
				type: "bears",
				id: "2",
				attributes: { name: "Cheer Bear" },
				relationships: {
					powers: { data: [{ type: "powers", id: "careBearStare" }] },
				},
			},
			{
				type: "bears",
				id: "3",
				attributes: { name: "Wish Bear" },
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
				attributes: { name: "Care Bear Stare" },
				relationships: {},
			},
			{
				type: "powers",
				id: "makeWish",
				attributes: { name: "Make a Wish" },
				relationships: {},
			},
		],
	});

	expect(result).toStrictEqual(store.query(query));
});
