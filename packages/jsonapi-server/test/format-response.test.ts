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

const ajv = new Ajv();
addFormats(ajv);
const validateResponse = ajv.compile(jsonApiSchema);

it("formats a request for all resources of a type", () => {
	const response = formatResponse(
		careBearSchema,
		{ type: "bears" },
		allBearsResult,
	);

	expect(response).toEqual(allBearsResponse);
	expect(validateResponse(response)).toEqual(true);
});

it("formats a request for a single resource", () => {
	const response = formatResponse(
		careBearSchema,
		{ type: "bears", id: "1" },
		allBearsResult[0],
	);

	expect(response).toEqual({ data: allBearsResponse.data[0] });
	expect(validateResponse(response)).toEqual(true);
});
