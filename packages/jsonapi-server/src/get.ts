import { formatResponse } from "./format-response";
import { parseRequest } from "./parse-request";

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
		} catch {
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}
