import { expect, it } from "vitest";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import careBearSchema from "./fixtures/care-bears.schema.json";
import jsonApiSchema from "./fixtures/json-api-schema.json";
import { formatResponse } from "../src/format-response";
import {
	allBearsResult,
	allBearsResponse,
} from "./fixtures/formatted-care-bear-data.js";
import { careBearData } from "./fixtures/care-bear-data.js"; // eslint-disable-line
import { Schema, createStore } from "data-prism";

const store = createStore(careBearSchema as Schema, careBearData);

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

it("formats a request for a single resource", () => {
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

it("formats a request for a nested resource", () => {
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
