import { mapValues } from "es-toolkit";
import { validateRequest } from "./validate-request.js";

/**
 * @typedef {Object} Ref
 * @property {string} type - Resource type
 * @property {string} id - Resource ID
 */

/**
 * @typedef {Object} CreateRequest
 * @property {Object} data - The resource data
 * @property {string} data.type - Resource type
 * @property {string} [data.id] - Resource ID
 * @property {Object.<string, unknown>} [data.attributes] - Resource attributes
 * @property {Object.<string, Ref|Ref[]>} [data.relationships] - Resource relationships
 */

/**
 * Creates a JSON:API create handler
 * @param {import("@spectragraph/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
export function create(schema, store) {
	return async (req, res) => {
		const { body } = req;
		const validationErrors = validateRequest(schema, body);
		if (validationErrors) {
			res.statusCode = 400;
			res.send({ errors: validationErrors });
			return;
		}

		try {
			const { data: resource } = req.body;
			const normalized = {
				...resource,
				relationships: mapValues(
					resource.relationships ?? {},
					(rel) => rel.data,
				),
			};

			const out = await store.create(normalized);
			res.statusCode = 201;
			res.json({
				data: {
					...out,
					relationships: mapValues(out.relationships, (rel) => ({ data: rel })),
				},
			});
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}
