import { formatResponse } from "./format-response.js";
import { parseRequest } from "./parse-request.js";

/**
 * Creates a JSON:API GET handler for a specific resource type
 * @param {import("@data-prism/core").Schema} schema - The schema defining resources
 * @param {*} store - The data store instance
 * @param {string} type - The resource type to handle
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
export function get(schema, store, type) {
	return async (req, res) => {
		try {
			const query = parseRequest(schema, {
				...req.query,
				type,
				id: req.params.id,
			});
			const result = await store.query(query);
			const response = formatResponse(schema, query, result);
			res.json(response);
		} catch (error) {
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}
