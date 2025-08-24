import { expect, it } from "vitest";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { createMemoryStore } from "@data-prism/memory-store";
import careBearSchema from "../fixtures/care-bears.schema.json";
import jsonApiSchema from "../fixtures/json-api-schema.json";
import { formatResponse } from "../../src/format-response";
import {
	allBearsResult,
	allBearsResponse,
} from "../fixtures/formatted-care-bear-data.js";
import { careBearData } from "../fixtures/care-bear-data.js"; // eslint-disable-line

const store = createMemoryStore(careBearSchema, careBearData);

const ajv = new Ajv();
addFormats(ajv);
const validateResponse = ajv.compile(jsonApiSchema);

it("formats a request for all resources of a type", () => {
	const response = formatResponse(
		careBearSchema,
		{
			type: "bears",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		},
		allBearsResult,
	);

	expect(response).toStrictEqual(allBearsResponse);
	expect(validateResponse(response)).toStrictEqual(true);
});

it("formats a response for a single resource", () => {
	const response = formatResponse(
		careBearSchema,
		{
			type: "bears",
			id: "1",
			select: Object.keys(careBearSchema.resources.bears.attributes),
		},
		allBearsResult[0],
	);

	expect(response).toStrictEqual({ data: allBearsResponse.data[0] });
	expect(validateResponse(response)).toStrictEqual(true);
});

it("formats a response for a nested resource", () => {
	const query = {
		type: "bears",
		id: "1",
		select: ["id", "name", { home: { select: ["id", "name"] } }],
	};

	const result = store.query(query);
	const response = formatResponse(careBearSchema, query, result);

	expect(response).toStrictEqual({
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
	});

	expect(validateResponse(response)).toStrictEqual(true);
});

it("formats a response for a doubly nested resource", () => {
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

	const result = store.query(query);
	const response = formatResponse(careBearSchema, query, result);

	expect(response).toStrictEqual({
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

	expect(validateResponse(response)).toStrictEqual(true);
});

it("formats a response for a nested resource of the same type as the primary resource", () => {
	const query = {
		type: "bears",
		id: "2",
		select: ["id", "name", { bestFriend: { select: ["id", "name"] } }],
	};

	const result = store.query(query);
	const response = formatResponse(careBearSchema, query, result);

	expect(response).toStrictEqual({
		data: {
			type: "bears",
			id: "2",
			attributes: { name: "Cheer Bear" },
			relationships: {
				bestFriend: { data: { type: "bears", id: "3" } },
			},
		},
		included: [
			{
				type: "bears",
				id: "3",
				attributes: { name: "Wish Bear" },
				relationships: {},
			},
		],
	});

	expect(validateResponse(response)).toStrictEqual(true);
});

it("formats a response for a nested resource of the same type as the primary resource when both are in data", () => {
	const query = {
		type: "bears",
		select: ["id", "name", { bestFriend: { select: ["id", "name"] } }],
	};

	const result = store.query(query);
	const response = formatResponse(careBearSchema, query, result);

	expect(response).toStrictEqual({
		data: [
			{
				type: "bears",
				id: "1",
				attributes: { name: "Tenderheart Bear" },
				relationships: {
					bestFriend: { data: null },
				},
			},
			{
				type: "bears",
				id: "2",
				attributes: { name: "Cheer Bear" },
				relationships: {
					bestFriend: { data: { type: "bears", id: "3" } },
				},
			},
			{
				type: "bears",
				id: "3",
				attributes: { name: "Wish Bear" },
				relationships: {
					bestFriend: { data: { type: "bears", id: "2" } },
				},
			},
			{
				type: "bears",
				id: "5",
				attributes: { name: "Smart Heart Bear" },
				relationships: {
					bestFriend: { data: null },
				},
			},
		],
	});

	expect(validateResponse(response)).toStrictEqual(true);
});
