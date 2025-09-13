import Ajv from "ajv";
import addFormats from "ajv-formats";
import jsonApiRequestSchema from "../fixtures/json-api-request.schema.json" with { type: "json" };

const ajv = new Ajv();
addFormats(ajv);
const validateRequestSchema = ajv.compile(jsonApiRequestSchema);

/**
 * Validates a JSON:API request against schema and format requirements
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} body - The request body to validate
 * @returns {Array|undefined} Array of validation errors, or undefined if valid
 */
export function validateRequest(schema, body) {
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
	if (!data) {
		return [
			{
				status: "400",
				title: "Invalid resource",
				description: "Request body must contain a 'data' property",
			},
		];
	}

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
