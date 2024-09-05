import { formatRequest } from "./format-request.js";
import { parseResponse } from "./parse-response.js";

export function createJSONAPIStore(schema, config) {
	const { transport } = config;

	const makeRequest = (req) => {
		try {
			return transport.get(req);
		} catch (err) {
			throw new Error({ ...err, transportError: true });
		}
	};

	return {
		async query(query) {
			try {
				const req = formatRequest(schema, config, query);
				const res = await makeRequest(req);

				return parseResponse(schema, query, res);
			} catch (err) {
				if (err.transportError && err.response?.statusCode === 404) {
					return null;
				}

				throw err;
			}
		},
		async create(resource) {},
	};
}
