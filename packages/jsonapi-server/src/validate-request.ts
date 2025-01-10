import Ajv from "ajv";
import addFormats from "ajv-formats";
import jsonApiRequestSchema from "../fixtures/json-api-request.schema.json" with { type: "json" };
import { CreateRequest } from "./create.js";
import { Schema } from "data-prism";

type Body = CreateRequest;

const ajv = new Ajv();
addFormats(ajv);
const validateRequestSchema = ajv.compile(jsonApiRequestSchema);

export function validateRequest(schema: Schema, body: Body) {
	const valid = validateRequestSchema(body);

	if (!valid) {
		return validateRequestSchema.errors.map((err) => ({
			status: "400",
			title: "Invalid request",
			description:
				"The request failed to pass the JSON:API schema validator. See meta for output.",
			meta: err,
		}));
	}

	const { data } = body;
	if (!(data.type in schema.resources)) {
		return [
			{
				status: "400",
				title: "Invalid resource",
				description: `${data.type} is not a valid resource type`,
			},
		];
	}
}
